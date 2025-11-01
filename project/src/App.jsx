import { useState, useRef, useEffect } from 'react'
import './App.css'
import abcjs from 'abcjs'

function App() {
    const [abcText, setAbcText] = useState(`X:1
T:Twinkle Twinkle Little Star
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 | G G F F | E E D2 | G G F F | E E D2 | C C G G | A A G2 | F F E E | D D C2`)

    const [isPlaying, setIsPlaying] = useState(false)
    const [activeNotes, setActiveNotes] = useState([])
    const audioContextRef = useRef(null)
    const visualObjRef = useRef(null)
    const synthControlRef = useRef(null)
    const cursorRef = useRef(null)

    // Инициализация аудиоконтекста
    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
        }
    }, [])

    // Функция для воспроизведения ABC нотации
    const playABC = () => {
        if (!abcText.trim()) return

        setIsPlaying(true)
        setActiveNotes([])

        // Останавливаем предыдущее воспроизведение
        if (synthControlRef.current) {
            synthControlRef.current.stop()
        }

        // Создаем визуальное представление
        const visualObj = abcjs.renderAbc("notation", abcText)[0]
        visualObjRef.current = visualObj

        // Создаем курсор
        cursorRef.current = abcjs.TimingCallbacks(visualObj, {
            // Обработка активных нот
            eventCallback: function(event) {
                if (event.measureStart && event.left === null) return

                // Получаем активные ноты в текущий момент
                const notes = []
                if (event.midi) {
                    if (Array.isArray(event.midi)) {
                        notes.push(...event.midi)
                    } else {
                        notes.push(event.midi)
                    }
                }

                setActiveNotes(notes)
            }
        })

        // Воспроизводим музыку
        synthControlRef.current = new abcjs.synth.SynthController()
        synthControlRef.current.load("#audio", cursorRef.current, {
            displayLoop: true,
            displayRestart: true,
            displayPlay: true,
            displayProgress: true,
            displayWarp: true
        })

        synthControlRef.current.setTune(visualObj, false, {
            chordsOff: false,
            program: 0, // Акустическое фортепиано
        }).then(() => {
            synthControlRef.current.play()
        })

        // Обработка завершения воспроизведения
        synthControlRef.current.onended = () => {
            setIsPlaying(false)
            setActiveNotes([])
        }
    }

    // Остановка воспроизведения
    const stopPlayback = () => {
        if (synthControlRef.current) {
            synthControlRef.current.stop()
            setIsPlaying(false)
            setActiveNotes([])
        }
    }

    // Функция для получения класса клавиши
    const getKeyClass = (note, isBlack) => {
        let baseClass = isBlack ? 'black-key' : 'white-key'
        if (activeNotes.includes(note)) {
            baseClass += ' active'
        }
        return baseClass
    }

    // Определение клавиш пианино (C4 до C5)
    const pianoKeys = [
        { note: 'C4', midi: 60, isBlack: false },
        { note: 'C#4', midi: 61, isBlack: true },
        { note: 'D4', midi: 62, isBlack: false },
        { note: 'D#4', midi: 63, isBlack: true },
        { note: 'E4', midi: 64, isBlack: false },
        { note: 'F4', midi: 65, isBlack: false },
        { note: 'F#4', midi: 66, isBlack: true },
        { note: 'G4', midi: 67, isBlack: false },
        { note: 'G#4', midi: 68, isBlack: true },
        { note: 'A4', midi: 69, isBlack: false },
        { note: 'A#4', midi: 70, isBlack: true },
        { note: 'B4', midi: 71, isBlack: false },
        { note: 'C5', midi: 72, isBlack: false }
    ]

    return (
        <div className="app">
            <h1>React Piano с ABC Notation</h1>

            <div className="abc-input">
                <h2>ABC Notation</h2>
                <textarea
                    value={abcText}
                    onChange={(e) => setAbcText(e.target.value)}
                    placeholder="Введите мелодию в формате ABC Notation..."
                    rows="10"
                />
                <div className="controls">
                    <button onClick={playABC} disabled={isPlaying}>
                        {isPlaying ? 'Воспроизведение...' : 'Воспроизвести'}
                    </button>
                    <button onClick={stopPlayback} disabled={!isPlaying}>
                        Остановить
                    </button>
                </div>
            </div>

            <div className="audio-controls">
                <div id="audio"></div>
            </div>

            <div className="piano-container">
                <h2>Пианино</h2>
                <div className="piano">
                    {pianoKeys.map(key => (
                        <div
                            key={key.note}
                            className={getKeyClass(key.midi, key.isBlack)}
                            data-note={key.note}
                            data-midi={key.midi}
                        >
                            {!key.isBlack && <span className="key-label">{key.note}</span>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="notation">
                <h2>Нотная запись</h2>
                <div id="notation"></div>
            </div>
        </div>
    )
}

export default App