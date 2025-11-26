import React, { useEffect, useState } from "react";
import quizData from "./data/quiz-data.json";

function generateId(prefix = "q") {
    return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}

export default function App() {
    const [questions, setQuestions] = useState(() => {
        return Array.isArray(quizData) ? quizData.map(q => ({ ...q })) : [];
    });

    const [mode, setMode] = useState("play"); // 'play' | 'admin'
    const [editingQuestion, setEditingQuestion] = useState(null);

    function addBlankQuestion() {
        const q = {
            id: generateId("q"),
            question: "Nova pergunta",
            correctAnswer: "Resposta correta",
            wrongAnswers: ["Errada 1", "Errada 2", "Errada 3"]
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
                const normalized = parsed.map((p) => ({
                    id: p.id || generateId("imp"),
                    question: String(p.question || ""),
                    correctAnswer: String(p.correctAnswer || ""),
                    wrongAnswers: Array.isArray(p.wrongAnswers) ? p.wrongAnswers.slice(0,3) : ["","",""]
                }));
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
            <h1>Ambiente de Quiz Educativo</h1>
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
                            <div className="q-sub">Correta: {q.correctAnswer}</div>
                        </div>
                        <div className="card-actions">
                            <button onClick={() => setEditingQuestion(q.id)}>Editar</button>
                            <button onClick={() => { if (confirm('Remover pergunta?')) removeQuestion(q.id); }}>Remover</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="editor">
                <div className="editor-title">Editar / Criar</div>
                <Editor
                    questions={questions}
                    editingQuestion={editingQuestion}
                    setEditingQuestion={setEditingQuestion}
                    updateQuestion={updateQuestion}
                />

                <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 6 }}>Importar JSON</label>
                    <input type="file" accept="application/json" onChange={handleFile} />
                </div>

                <div style={{ marginTop: 12 }}>
                    <button onClick={exportJson}>Download JSON Atual</button>
                </div>
            </div>
        </div>
    );
}

function Editor({ questions, editingQuestion, setEditingQuestion, updateQuestion }) {
    const init = editingQuestion ? questions.find(q => q.id === editingQuestion) : null;
    const [form, setForm] = useState(() => init || {
        id: "",
        question: "",
        correctAnswer: "",
        wrongAnswers: ["", "", ""]
    });

    useEffect(() => {
        if (editingQuestion) {
            const found = questions.find(q => q.id === editingQuestion);
            if (found) setForm(found);
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
            correctAnswer: String(form.correctAnswer),
            wrongAnswers: form.wrongAnswers.slice(0,3).map(String)
        };
        updateQuestion(normalized);
        setEditingQuestion(null);
    }

    return (
        <div className="editor-form">
            <input value={form.question} placeholder="Texto da pergunta" onChange={e => setForm({ ...form, question: e.target.value })} />
            <input value={form.correctAnswer} placeholder="Resposta correta" onChange={e => setForm({ ...form, correctAnswer: e.target.value })} />
            {form.wrongAnswers.map((w, i) => (
                <input key={i} value={w} placeholder={`Resposta errada ${i+1}`} onChange={e => {
                    const arr = form.wrongAnswers.slice(); arr[i] = e.target.value; setForm({ ...form, wrongAnswers: arr });
                }} />
            ))}
            <div className="editor-actions" style={{ marginTop: 8 }}>
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

    const [selected, setSelected] = useState(null);      // resposta clicada
    const [isLocked, setIsLocked] = useState(false);     // trava cliques

    useEffect(() => {
        setIndex(0);
        setScore(0);
        setFinished(false);
    }, [questions]);

    useEffect(() => {
        const q = questions[index];
        if (!q) return;

        const choices = [q.correctAnswer, ...q.wrongAnswers].slice(0, 4);
        setShuffled(shuffleArray(choices));
        setSelected(null);
        setIsLocked(false);
    }, [index, questions]);

    function handleAnswer(choice) {
        if (isLocked) return;

        const q = questions[index];
        const correct = choice === q.correctAnswer;

        setSelected(choice);
        setIsLocked(true);

        if (correct) {
            setScore(s => s + 1);
        }

        setTimeout(() => {
            const next = index + 1;
            if (next >= questions.length) {
                setFinished(true);
            } else {
                setIndex(next);
            }
        }, 2000);
    }

    if (!questions || questions.length === 0) {
        return (
            <div className="empty">
                Nenhuma pergunta cadastrada. Entre no Admin para adicionar.
            </div>
        );
    }

    if (finished) {
        return (
            <div className="result">
                <div className="title">Resultado</div>
                <div className="score">Pontuação: {score} / {questions.length}</div>
                <div className="actions">
                    <button onClick={() => {
                        setIndex(0);
                        setScore(0);
                        setFinished(false);
                    }}>
                        Refazer
                    </button>
                </div>
            </div>
        );
    }

    const q = questions[index];

    return (
        <div className="play">
            <div className="q-count">Pergunta {index + 1} de {questions.length}</div>
            <div className="q-text-large">{q.question}</div>

            <div className="choices">
                {shuffled.map((choice, i) => {
                    let className = "";

                    if (selected) {
                        if (choice === q.correctAnswer && choice === selected) {
                            className = "choice-correct";
                        } else if (choice === selected && choice !== q.correctAnswer) {
                            className = "choice-wrong";
                        }
                    }

                    return (
                        <button
                            key={i}
                            className={className}
                            onClick={() => handleAnswer(choice)}
                            disabled={isLocked}
                            style={{
                                opacity: isLocked && choice !== selected ? 0.7 : 1,
                                cursor: isLocked ? "default" : "pointer"
                            }}
                        >
                            {choice}
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
