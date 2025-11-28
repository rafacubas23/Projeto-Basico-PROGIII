import React, { useEffect, useState } from "react";
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

    const confettiCanvasRef = React.useRef(null);
    const confettiAnimRef = React.useRef(null);

    useEffect(() => { setIndex(0); setScore(0); setFinished(false); }, [questions]);

    useEffect(() => {
        const q = questions[index];
        if (!q) { setShuffled([]); return; }
        let rawChoices;
        if (Array.isArray(q.choices) && q.choices.length > 0) {
            rawChoices = q.choices.map(c => ({ text: String(c.text || ""), icon: c.icon || "", isCorrect: !!c.isCorrect }));
        } else {
            const arr = [];
            if (q.correctAnswer !== undefined) arr.push({ text: String(q.correctAnswer), icon: "", isCorrect: true });
            const wrongs = Array.isArray(q.wrongAnswers) ? q.wrongAnswers : [];
            wrongs.slice(0,3).forEach(w => arr.push({ text: String(w), icon: "", isCorrect: false }));
            rawChoices = arr;
        }
        setShuffled(shuffleArray(rawChoices));
        setSelected(null);
        setIsLocked(false);
    }, [index, questions]);

    function playTone({ freq = 440, duration = 0.12, type = "sine", volume = 0.08 } = {}) {
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
            setTimeout(() => { o.stop(); ctx.close(); }, duration * 1000 + 50);
        } catch (e) {}
    }

    function fireConfetti() {
        const canvas = confettiCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let W = canvas.width = canvas.clientWidth;
        let H = canvas.height = canvas.clientHeight;
        const particles = [];
        const count = 80;
        for (let i = 0; i < count; i++) {
            particles.push({
                x: W / 2 + (Math.random() - 0.5) * 100,
                y: H / 2 + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 8 - 3,
                size: 6 + Math.random() * 8,
                ttl: 900 + Math.random() * 500,
                age: 0,
                color: `hsl(${Math.floor(Math.random()*360)},70%,55%)`,
                rotate: Math.random() * Math.PI * 2,
                vr: (Math.random() - 0.5) * 0.3
            });
        }

        const start = performance.now();
        function frame(now) {
            const dt = now - start;
            ctx.clearRect(0,0,W,H);
            for (let p of particles) {
                p.age += 16.67;
                p.vy += 0.32; // gravity
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
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.6);
                ctx.restore();
            }

            let anyAlive = false;
            for (let p of particles) if (p.age < p.ttl) { anyAlive = true; break; }
            if (anyAlive) {
                confettiAnimRef.current = requestAnimationFrame(frame);
            } else {
                ctx.clearRect(0,0,W,H);
                cancelAnimationFrame(confettiAnimRef.current);
                confettiAnimRef.current = null;
            }
        }
        if (confettiAnimRef.current) cancelAnimationFrame(confettiAnimRef.current);
        confettiAnimRef.current = requestAnimationFrame(frame);
    }

    function handleAnswer(choice) {
        if (isLocked) return;
        const q = questions[index];
        if (!q) return;

        const correct = !!choice.isCorrect;
        setSelected(choice);
        setIsLocked(true);

        if (correct) {
            setScore(s => s + 1);
            playTone({ freq: 880, duration: 0.12, type: "sine", volume: 0.06 });
            fireConfetti();
        } else {
            playTone({ freq: 240, duration: 0.18, type: "sawtooth", volume: 0.07 });
        }

        setTimeout(() => {
            const next = index + 1;
            if (next >= questions.length) setFinished(true);
            else setIndex(next);
        }, 2000);
    }

    useEffect(() => {
        function handleResize() {
            const c = confettiCanvasRef.current;
            if (!c) return;
            c.width = c.clientWidth;
            c.height = c.clientHeight;
        }
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => { window.removeEventListener("resize", handleResize); if (confettiAnimRef.current) cancelAnimationFrame(confettiAnimRef.current); };
    }, []);

    if (!questions || questions.length === 0) {
        return (<div className="empty">Nenhuma pergunta cadastrada. Entre no Admin para adicionar.</div>);
    }

    if (finished) {
        return (
            <div className="result">
                <div className="title">Resultado</div>
                <div className="score">Pontuação: {score} / {questions.length}</div>
                <div className="actions" style={{ display:"flex", justifyContent:"center", gap:12 }}>
                    <button onClick={() => { setIndex(0); setScore(0); setFinished(false); }}>Refazer</button>
                </div>
            </div>
        );
    }

    const q = questions[index];
    const progressPercent = Math.round(((index + 1) / questions.length) * 100);

    return (
        <div className="play" aria-live="polite" style={{ position: "relative" }}>
            <canvas ref={confettiCanvasRef} className="confetti-canvas" aria-hidden style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 40 }} />
            <div className="progress-wrap" aria-hidden>
                <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="q-count">Pergunta {index + 1} de {questions.length}</div>
            <div className="q-text-large">{q.question}</div>

            <div className="choices" role="list">
                {shuffled.map((choice, i) => {
                    let className = "";
                    if (selected) {
                        const isCorrect = choice.isCorrect;
                        const isSelected = selected && selected.text === choice.text;
                        if (isCorrect) className = "choice-correct";
                        if (isSelected && !isCorrect) className = "choice-wrong";
                    }

                    return (
                        <button
                            key={i}
                            role="listitem"
                            className={`choice-btn ${className}`}
                            onClick={() => handleAnswer(choice)}
                            disabled={isLocked}
                            aria-pressed={selected === choice}
                        >
                            <div className="choice-icon" aria-hidden>{choice.icon || ""}</div>
                            <div style={{ flex:1, textAlign:"left" }}>{choice.text}</div>
                        </button>
                    );
                })}
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
