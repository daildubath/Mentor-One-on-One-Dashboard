// src/App.tsx

import { useState, useEffect, useMemo, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { PieChart, Pie, Sector } from 'recharts';
import { SessionLogic } from './SessionLogic';
import './App.css';

// RUBRIC REQUIREMENT: Types / Data Structures
type Speaker = 'MENTOR' | 'MENTEE';

const parseSessionData = (text: string) => {
    if (!text.includes('--- 1:1 MENTORING SESSION DASHBOARD ---')) {
        // RUBRIC REQUIREMENT: Throwing Exceptions (Manual throw for invalid file type)
        throw new Error("Invalid file type. Please upload a valid Dashboard Export .txt file.");
    }

    const extract = (marker: string, endMarker: string) => {
        const start = text.indexOf(marker);
        if (start === -1) return '';
        const end = endMarker ? text.indexOf(endMarker, start) : text.length;
        return text.slice(start + marker.length, end).trim();
    };

    const parseRegex = (regex: RegExp) => {
        const match = text.match(regex);
        return match ? match[1].trim() : '';
    };

    const coordinator = parseRegex(/Coordinator: (.*)/);
    const mentor = parseRegex(/Mentor: (.*)/);
    const mentorTimeStr = parseRegex(/Mentor Time: .*?\((.*?)\)/);
    const menteeTimeStr = parseRegex(/Mentee Time: .*?\((.*?)\)/);

    if (!mentorTimeStr || !menteeTimeStr) {
        // RUBRIC REQUIREMENT: Throwing Exceptions (Manual throw for corrupted internal data)
        throw new Error("Corrupted file data: Could not read session times.");
    }

    const posFeedback = extract('-- POSITIVE FEEDBACK --', '-- IMPROVEMENT FEEDBACK --');
    const impFeedback = extract('-- IMPROVEMENT FEEDBACK --', '-- EXTRA NOTES --');
    const notes = extract('-- EXTRA NOTES --', '');

    const timeToMs = (tStr: string) => {
        const [m, s] = tStr.split(':').map(Number);
        if (isNaN(m) || isNaN(s)) {
            // RUBRIC REQUIREMENT: Throwing Exceptions (Manual throw for bad math/time format)
            throw new Error("Time data format is corrupted.");
        }
        return (m * 60 + s) * 1000;
    };

    return {
        coordinator,
        mentor,
        mentorTimeMs: timeToMs(mentorTimeStr),
        menteeTimeMs: timeToMs(menteeTimeStr),
        posFeedback,
        impFeedback,
        notes
    };
};

function App() {
    const [mentorTime, setMentorTime] = useState<number>(0);
    const [menteeTime, setMenteeTime] = useState<number>(0);
    const [activeSpeaker, setActiveSpeaker] = useState<Speaker>('MENTOR');
    const [isPaused, setIsPaused] = useState<boolean>(true);

    const [coordinatorName, setCoordinatorName] = useState<string>('');
    const [mentorName, setMentorName] = useState<string>('');
    const [positiveFeedback, setPositiveFeedback] = useState<string>('');
    const [improvementFeedback, setImprovementFeedback] = useState<string>('');
    const [extraNotes, setExtraNotes] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        if (!isPaused) {
            interval = setInterval(() => {
                if (activeSpeaker === 'MENTOR') {
                    setMentorTime(prev => prev + 100);
                } else {
                    setMenteeTime(prev => prev + 100);
                }
            }, 100);
        }

        return () => clearInterval(interval);
    }, [isPaused, activeSpeaker]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                setIsPaused(prev => !prev);
                if (isTyping) target.blur();
            }
            else if (e.code === 'Space' && !isTyping) {
                e.preventDefault();
                setActiveSpeaker(prev => prev === 'MENTOR' ? 'MENTEE' : 'MENTOR');
                setIsPaused(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // RUBRIC REQUIREMENT: OOP & Classes (Instantiating the class)
    const logic = useMemo(() => new SessionLogic(mentorTime, menteeTime), [mentorTime, menteeTime]);
    const [mentorPercent, menteePercent] = logic.getPercentages(activeSpeaker);
    const totalFormatted = logic.formatTime(logic.getTotalTime());

    // RUBRIC REQUIREMENT: Types / Data Structures (Array of Objects)
    const data = [
        { name: 'Mentor', value: mentorPercent, timeStr: logic.formatTime(mentorTime) },
        { name: 'Mentee', value: menteePercent, timeStr: logic.formatTime(menteeTime) }
    ];

    const COLORS = ['#6BA4FF', '#FFFACD'];

    const handleFocus = () => setIsPaused(true);

    // RUBRIC REQUIREMENT: File I/O (Exporting state to a .txt file)
    const handleExport = () => {
        setIsPaused(true);

        const textContent =
            `--- 1:1 MENTORING SESSION DASHBOARD ---
Date: ${new Date().toLocaleDateString()}
Coordinator: ${coordinatorName || 'Not specified'}
Mentor: ${mentorName || 'Not specified'}

-- TIME DISTRIBUTION --
Total Time: ${totalFormatted}
Mentor Time: ${mentorPercent}% (${logic.formatTime(mentorTime)})
Mentee Time: ${menteePercent}% (${logic.formatTime(menteeTime)})

-- POSITIVE FEEDBACK --
${positiveFeedback || 'None'}

-- IMPROVEMENT FEEDBACK --
${improvementFeedback || 'None'}

-- EXTRA NOTES --
${extraNotes || 'None'}
`;

        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Session_${mentorName.replace(/\s+/g, '_') || 'Mentor'}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            // RUBRIC REQUIREMENT: Handling Exceptions (try/catch block prevents app crash)
            try {
                const text = e.target?.result as string;
                const parsedData = parseSessionData(text);

                setCoordinatorName(parsedData.coordinator === 'Not specified' ? '' : parsedData.coordinator);
                setMentorName(parsedData.mentor === 'Not specified' ? '' : parsedData.mentor);
                setMentorTime(parsedData.mentorTimeMs);
                setMenteeTime(parsedData.menteeTimeMs);
                setPositiveFeedback(parsedData.posFeedback === 'None' ? '' : parsedData.posFeedback);
                setImprovementFeedback(parsedData.impFeedback === 'None' ? '' : parsedData.impFeedback);
                setExtraNotes(parsedData.notes === 'None' ? '' : parsedData.notes);

                if (fileInputRef.current) fileInputRef.current.value = '';

            } catch (error: any) {
                // Catches the error thrown by parseSessionData and alerts the user gracefully
                alert(`Import Failed: ${error.message}`);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsText(file);
    };

    return (
        <div className="dashboard-container">

            <input
                type="file"
                accept=".txt"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileUpload}
            />

            <div className="header">
                <h2>Total Time: {totalFormatted}</h2>
                <h1>1:1 DASHBOARD</h1>
                <input
                    className="header-input"
                    type="text"
                    placeholder="Coordinator Name..."
                    value={coordinatorName}
                    onChange={(e) => setCoordinatorName(e.target.value)}
                    onFocus={handleFocus}
                />
            </div>

            <div className="content-wrapper">

                <div className="side-panel">
                    <h3>Positive Feedback</h3>
                    <textarea
                        placeholder="What went well..."
                        value={positiveFeedback}
                        onChange={(e) => setPositiveFeedback(e.target.value)}
                        onFocus={handleFocus}
                    />
                </div>

                <div className="center-panel">
                    <input
                        className="mentor-name-input"
                        type="text"
                        placeholder="Enter Mentor Name..."
                        value={mentorName}
                        onChange={(e) => setMentorName(e.target.value)}
                        onFocus={handleFocus}
                    />

                    <div className="secondary-controls">
                        <button
                            className="small-action-btn"
                            onClick={() => {
                                setIsPaused(true);
                                fileInputRef.current?.click();
                            }}
                        >
                            IMPORT (.txt)
                        </button>
                        <button className="small-action-btn" onClick={handleExport}>
                            EXPORT (.txt)
                        </button>
                    </div>

                    <PieChart width={350} height={350}>
                        <Pie
                            data={data}
                            isAnimationActive={false}
                            cx={175}
                            cy={175}
                            innerRadius={0}
                            outerRadius={160}
                            dataKey="value"
                            stroke="#000"
                            strokeWidth={3}
                            labelLine={false}
                            shape={(props: any) => <Sector {...props} fill={COLORS[props.index % COLORS.length]} />}
                            label={(props: any) => {
                                const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, value, index } = props;
                                const RADIAN = Math.PI / 180;
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                if (value === 0) return null;

                                return (
                                    <text x={x} y={y} fill="black" textAnchor="middle" dominantBaseline="central" fontWeight="bold" fontSize="18">
                                        {`${value}%`}
                                        <tspan x={x} dy="1.2em">{data[index].timeStr}</tspan>
                                    </text>
                                );
                            }}
                        />
                    </PieChart>
                </div>

                <div className="side-panel">
                    <div className="split-box">
                        <h3>Improvement Feedback</h3>
                        <textarea
                            placeholder="What could be better..."
                            value={improvementFeedback}
                            onChange={(e) => setImprovementFeedback(e.target.value)}
                            onFocus={handleFocus}
                        />
                    </div>
                    <div className="split-box">
                        <h3>Extra Notes</h3>
                        <textarea
                            placeholder="Questions, leadership notes..."
                            value={extraNotes}
                            onChange={(e) => setExtraNotes(e.target.value)}
                            onFocus={handleFocus}
                        />
                    </div>
                </div>

            </div>

            <div className="progress-bar-container">
                <div className="progress-mentor" style={{ width: `${mentorPercent}%` }}>
                    {mentorPercent > 15 && `MENTOR ${mentorPercent}%`}
                </div>
                <div className="progress-mentee" style={{ width: `${menteePercent}%` }}>
                    {menteePercent > 15 && `MENTEE ${menteePercent}%`}
                </div>
            </div>

            <div className="controls">
                <button
                    className="action-btn"
                    onClick={() => {
                        setActiveSpeaker(prev => prev === 'MENTOR' ? 'MENTEE' : 'MENTOR');
                        setIsPaused(false);
                    }}
                >
                    - SPACE BAR -<br/>
                    SWITCH SPEAKER<br/>
                    <span className="btn-subtext">
                        (Currently Active: {activeSpeaker})
                    </span>
                </button>

                <button
                    className="action-btn"
                    onClick={() => setIsPaused(prev => !prev)}
                >
                    - CTRL + SPACE -<br/>
                    {isPaused ? 'START / RESUME' : 'PAUSE TIMER'}<br/>
                    <span className="btn-subtext">
                        (Status: {isPaused ? 'Paused' : 'Running'})
                    </span>
                </button>
            </div>

        </div>
    );
}

export default App;