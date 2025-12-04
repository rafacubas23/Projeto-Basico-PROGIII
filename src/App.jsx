import React, { useEffect, useState, useRef } from "react";
import quizData from "./data/quiz-data.json";
import "./styles.css";

function generateId(prefix = "q") {
    return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}

export default function App() {
    const [questions, setQuestions] = useState(() => (Array.isArray(quizData) ? quizData.map(q => ({ ...q })) : []));
    const [mode, setMode] = useState("play");
    const [editingQuestion, setEditingQuestion] = useState(null);

    function addBlankQuestion() {
        const q = {
            id: generateId("q"),
            question: "Nova pergunta",
            choices: [
                { text: "Resposta correta", icon: "✅", isCorrect: true },
                { text: "Errada 1", icon: "❌", isCorrect: false },
                { text: "Errada 2", icon: "❌", isCorrect: false },
                { text: "Errada 3", icon: "❌", isCorrect: false }
            ]
        };
        setQuestions(prev => [q, ...prev]);
        setEditingQuestion(q.id);
        setMode("admin");
    }

    function updateQuestion(updated) {
        setQuestions(prev => {
            const found = prev.find(p => p.id === updated.id);
            if (found) return prev.map(q => (q.id === updated.id ? updated : q));
            return [updated, ...prev];
        });
    }

    function removeQuestion(id) {
        setQuestions(prev => prev.filter(q => q.id !== id));
    }

    function importJsonFile(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (!Array.isArray(parsed)) throw new Error("JSON deve ser um array de perguntas");
                const normalized = parsed.map((p) => {
                    if (Array.isArray(p.choices) && p.choices.length > 0) {
                        return {
                            id: p.id || generateId("imp"),
                            question: String(p.question || ""),
                            choices: p.choices.map(c => ({ text: String(c.text || ""), icon: c.icon || "", isCorrect: !!c.isCorrect }))
                        };
                    } else {
                        const arr = [];
                        if (p.correctAnswer !== undefined) arr.push({ text: String(p.correctAnswer), icon: "", isCorrect: true });
                        const wrongs = Array.isArray(p.wrongAnswers) ? p.wrongAnswers : [];
                        wrongs.slice(0,3).forEach(w => arr.push({ text: String(w), icon: "", isCorrect: false }));
                        return { id: p.id || generateId("imp"), question: String(p.question || ""), choices: arr };
                    }
                });
                setQuestions(normalized);
                setMode("play");
            } catch (err) {
                alert("Falha ao importar JSON: " + err.message);
            }
        };
        reader.readAsText(file);
    }

    function exportJson() {
        const blob = new Blob([JSON.stringify(questions, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "quiz-data-export.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="app-root">
            <div className="container">
                <Header mode={mode} setMode={setMode} addBlankQuestion={addBlankQuestion} exportJson={exportJson} />
                {mode === "play" ? (
                    <QuizPlayer questions={questions} />
                ) : (
                    <AdminPanel
                        questions={questions}
                        setQuestions={setQuestions}
                        editingQuestion={editingQuestion}
                        setEditingQuestion={setEditingQuestion}
                        updateQuestion={updateQuestion}
                        removeQuestion={removeQuestion}
                        importJsonFile={importJsonFile}
                        exportJson={exportJson}
                    />
                )}
            </div>
        </div>
    );
}

function Header({ mode, setMode, addBlankQuestion, exportJson }) {
    return (
        <div className="header">
            <h1>Quiz Educativo</h1>
            <div className="controls">
                <button onClick={() => setMode(mode === "play" ? "admin" : "play")}>
                    {mode === "play" ? "Entrar no Admin" : "Voltar ao Quiz"}
                </button>
                {mode === "admin" && (
                    <>
                        <button className="primary" onClick={addBlankQuestion}>Adicionar pergunta</button>
                        <button onClick={exportJson}>Exportar JSON</button>
                    </>
                )}
            </div>
        </div>
    );
}

function AdminPanel({ questions, setQuestions, editingQuestion, setEditingQuestion, updateQuestion, removeQuestion, importJsonFile, exportJson }) {
    function handleFile(e) {
        const f = e.target.files && e.target.files[0];
        if (f) importJsonFile(f);
        e.target.value = null;
    }

    return (
        <div className="admin-grid">
            <div className="list">
                {questions.map(q => (
                    <div key={q.id} className="card">
                        <div>
                            <div className="q-text">{q.question}</div>
                            <div className="q-sub">
                                {Array.isArray(q.choices) ? `Alternativas: ${q.choices.length}` : ""}
                            </div>
                        </div>
                        <div className="card-actions">
                            <button onClick={() => setEditingQuestion(q.id)}>Editar</button>
                            <button onClick={() => { if (confirm('Remover pergunta?')) removeQuestion(q.id); }}>Remover</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="editor">
                <div className="editor-title" style={{ fontWeight:700, marginBottom:8 }}>Editar / Criar</div>
                <Editor questions={questions} editingQuestion={editingQuestion} setEditingQuestion={setEditingQuestion} updateQuestion={updateQuestion} />
                <div style={{ marginTop:12 }}>
                    <label style={{ fontSize:13, color:"#6b7280", display:"block", marginBottom:6 }}>Importar JSON</label>
                    <input type="file" accept="application/json" onChange={handleFile} />
                </div>
                <div style={{ marginTop:12 }}>
                    <button onClick={exportJson}>Download JSON Atual</button>
                </div>
            </div>
        </div>
    );
}

function Editor({ questions, editingQuestion, setEditingQuestion, updateQuestion }) {
    const init = editingQuestion ? questions.find(q => q.id === editingQuestion) : null;
    const [form, setForm] = useState(() => init || { id: "", question: "", correctAnswer: "", wrongAnswers: ["", "", ""] });

    useEffect(() => {
        if (editingQuestion) {
            const found = questions.find(q => q.id === editingQuestion);
            if (found) {
                if (Array.isArray(found.choices)) {
                    const correct = found.choices.find(c => c.isCorrect) || { text: "", icon: "" };
                    const wrongs = found.choices.filter(c => !c.isCorrect).map(c => c.text);
                    setForm({ id: found.id, question: found.question, correctAnswer: correct.text || "", wrongAnswers: [wrongs[0] || "", wrongs[1] || "", wrongs[2] || ""] });
                } else {
                    setForm(found);
                }
            }
        } else {
            setForm({ id: "", question: "", correctAnswer: "", wrongAnswers: ["", "", ""] });
        }
    }, [editingQuestion, questions]);

    function onSave() {
        if (!form.question.trim()) return alert("Pergunta vazia");
        if (!form.correctAnswer.trim()) return alert("Resposta correta vazia");
        const normalized = {
            id: form.id || generateId("q"),
            question: String(form.question),
            choices: [
                { text: String(form.correctAnswer), icon: "", isCorrect: true },
                { text: String(form.wrongAnswers[0] || ""), icon: "", isCorrect: false },
                { text: String(form.wrongAnswers[1] || ""), icon: "", isCorrect: false },
                { text: String(form.wrongAnswers[2] || ""), icon: "", isCorrect: false }
            ]
        };
        updateQuestion(normalized);
        setEditingQuestion(null);
    }

    return (
        <div className="editor-form">
            <input value={form.question} placeholder="Texto da pergunta" onChange={e => setForm({ ...form, question: e.target.value })} />
            <input value={form.correctAnswer} placeholder="Resposta correta" onChange={e => setForm({ ...form, correctAnswer: e.target.value })} />
            {form.wrongAnswers.map((w, i) => (
                <input key={i} value={w} placeholder={`Resposta errada ${i+1}`} onChange={e => { const arr = form.wrongAnswers.slice(); arr[i] = e.target.value; setForm({ ...form, wrongAnswers: arr }); }} />
            ))}
            <div className="editor-actions" style={{ marginTop:8 }}>
                <button onClick={onSave}>Salvar</button>
                <button onClick={() => setEditingQuestion(null)}>Cancelar</button>
            </div>
        </div>
    );
}

function QuizPlayer({ questions }) {
    const [index, setIndex] = useState(0);
    const [shuffled, setShuffled] = useState([]);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [selected, setSelected] = useState(null);
    const [isLocked, setIsLocked] = useState(false);

    const [timeLeft, setTimeLeft] = useState(120);
    const timerRef = useRef(null);

    const confettiCanvasRef = useRef(null);
    const confettiAnimRef = useRef(null);

    useEffect(() => {
        setIndex(0);
        setScore(0);
        setFinished(false);
    }, [questions]);

    useEffect(() => {
        const q = questions[index];
        if (!q) return;

        const rawChoices = q.choices.map(c => ({
            text: c.text,
            icon: c.icon,
            isCorrect: c.isCorrect
        }));

        setShuffled(shuffleArray(rawChoices));
        setSelected(null);
        setIsLocked(false);
        setTimeLeft(120);

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timerRef.current);
                    handleTimeUp();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [index, questions]);

    function playTone({ freq = 440, duration = 0.12, type = "sine", volume = 0.08 }) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = type;
            o.frequency.value = freq;
            g.gain.value = volume;
            o.connect(g);
            g.connect(ctx.destination);
            o.start();
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
            setTimeout(() => {
                o.stop();
                ctx.close();
            }, duration * 1000 + 50);
        } catch (e) {}
    }

    function fireConfetti() {
        const canvas = confettiCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        let W = canvas.width = canvas.clientWidth;
        let H = canvas.height = canvas.clientHeight;

        const particles = [];
        for (let i = 0; i < 80; i++) {
            particles.push({
                x: W / 2,
                y: H / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 8 - 3,
                size: 6 + Math.random() * 8,
                ttl: 900 + Math.random() * 500,
                age: 0,
                color: `hsl(${Math.floor(Math.random() * 360)},70%,55%)`,
                rotate: Math.random() * Math.PI * 2,
                vr: (Math.random() - 0.5) * 0.3
            });
        }

        function frame() {
            ctx.clearRect(0, 0, W, H);
            for (let p of particles) {
                p.age += 16.6;
                p.vy += 0.32;
                p.x += p.vx;
                p.y += p.vy;
                p.rotate += p.vr;

                const alpha = 1 - p.age / p.ttl;
                if (alpha <= 0) continue;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotate);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            }

            if (particles.some(p => p.age < p.ttl)) {
                confettiAnimRef.current = requestAnimationFrame(frame);
            } else {
                ctx.clearRect(0, 0, W, H);
            }
        }

        cancelAnimationFrame(confettiAnimRef.current);
        confettiAnimRef.current = requestAnimationFrame(frame);
    }

    function handleAnswer(choice) {
        if (isLocked) return;

        clearInterval(timerRef.current);

        const correct = choice.isCorrect;
        setSelected(choice);
        setIsLocked(true);

        if (correct) {
            setScore(s => s + 1);
            playTone({ freq: 880, duration: 0.12 });
            fireConfetti();
        } else {
            playTone({ freq: 240, duration: 0.18, type: "sawtooth" });
        }

        setTimeout(() => {
            const next = index + 1;
            if (next >= questions.length) setFinished(true);
            else setIndex(next);
        }, 2000);
    }

    function handleTimeUp() {
        if (isLocked) return;

        const correct = shuffled.find(c => c.isCorrect);
        setSelected(correct);
        setIsLocked(true);

        playTone({ freq: 200, duration: 0.20, type: "square" });

        setTimeout(() => {
            const next = index + 1;
            if (next >= questions.length) setFinished(true);
            else setIndex(next);
        }, 2000);
    }

    function formatTime(t) {
        const m = Math.floor(t / 60);
        const s = t % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    if (!questions.length) {
        return <div className="empty">Nenhuma pergunta cadastrada.</div>;
    }

    if (finished) {
        return (
            <div className="result">
                <div className="title">Resultado</div>
                <div className="score">Pontuação: {score} / {questions.length}</div>
                <button onClick={() => { setIndex(0); setScore(0); setFinished(false); }}>Refazer</button>
            </div>
        );
    }

    const q = questions[index];
    const progressPercent = Math.round(((index + 1) / questions.length) * 100);

    return (
        <div className="play" style={{ position: "relative" }}>
            <canvas ref={confettiCanvasRef} className="confetti-canvas" />

            <div className="progress-wrap">
                <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="q-count">Pergunta {index + 1} de {questions.length}</div>
            <div className="q-text-large">{q.question}</div>

            <div className="choices">
                {shuffled.map((choice, i) => {
                    let className = "";
                    if (selected) {
                        if (choice.isCorrect) className = "choice-correct";
                        if (selected.text === choice.text && !choice.isCorrect) className = "choice-wrong";
                    }

                    return (
                        <button
                            key={i}
                            className={`choice-btn ${className}`}
                            onClick={() => handleAnswer(choice)}
                            disabled={isLocked}
                        >
                            <div className="choice-icon">{choice.icon}</div>
                            <div style={{ flex: 1 }}>{choice.text}</div>
                        </button>
                    );
                })}
            </div>

            <div
                className={`timer-text ${timeLeft <= 10 ? "timer-warning" : ""}`}
                style={{ marginTop: "32px" }}
            >
                Tempo restante: {formatTime(timeLeft)}
            </div>

            <div className="timer-bar-container" style={{ marginTop: "8px" }}>
                <div
                    className="timer-bar"
                    style={{ width: `${(timeLeft / 120) * 100}%` }}
                />
            </div>

            <div className="status">Pontuação atual: {score}</div>
        </div>
    );

}


function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
