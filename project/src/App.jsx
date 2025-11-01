import { useState, useRef, useEffect } from 'react'
import './App.css'
import abcjs from 'abcjs'
import 'abcjs/abcjs-audio.css'

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
        // Создаем аудиоконтекст только при взаимодействии пользователя
        const initAudioContext = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
            }
        }

        // Добавляем обработчик для инициализации аудиоконтекста при первом взаимодействии
        document.addEventListener('click', initAudioContext, { once: true })

        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
            // Останавливаем воспроизведение при размонтировании
            stopPlayback();
        }
    }, [])

    // Функция для воспроизведения ABC нотации
    const playABC = async () => {
        if (!abcText.trim()) return

        // Инициализируем аудиоконтекст если еще не инициализирован
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        }

        setIsPlaying(true)
        setActiveNotes([])

        // Останавливаем предыдущее воспроизведение
        stopPlayback();

        // Очищаем предыдущую нотацию
        const notationElement = document.getElementById('notation')
        if (notationElement) {
            notationElement.innerHTML = ''
        }

        // Очищаем предыдущие элементы управления
        const audioControl = document.getElementById('audio-control')
        if (audioControl) {
            audioControl.innerHTML = ''
        }

        // Создаем визуальное представление
        try {
            const visualObj = abcjs.renderAbc("notation", abcText)[0]
            visualObjRef.current = visualObj

            // Создаем курсор
            cursorRef.current = new abcjs.TimingCallbacks(visualObj, {
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

            // Создаем контроллер синтезатора
            synthControlRef.current = new abcjs.synth.SynthController()

            // Загружаем контроллер в DOM элемент
            synthControlRef.current.load("#audio-control", cursorRef.current, {
                displayLoop: true,
                displayRestart: true,
                displayPlay: true,
                displayProgress: true,
                displayWarp: true
            })

            // Устанавливаем мелодию и воспроизводим
            await synthControlRef.current.setTune(visualObj, false, {
                chordsOff: false,
                program: 0, // Акустическое фортепиано
                midiTranspose: 0,
                velocity: 0.8
            })

            console.log("Tune loaded successfully")

            // Добавляем обработчики событий
            if (synthControlRef.current) {
                // Обработка завершения воспроизведения
                const audioControlElement = document.getElementById('audio-control')
                if (audioControlElement) {
                    // Слушаем событие окончания воспроизведения
                    audioControlElement.addEventListener('ended', () => {
                        setIsPlaying(false)
                        setActiveNotes([])
                    })

                    // Слушаем событие остановки
                    audioControlElement.addEventListener('stop', () => {
                        setIsPlaying(false)
                        setActiveNotes([])
                    })
                }

                // Запускаем воспроизведение
                const playButton = audioControlElement?.querySelector('.abcjs-btn.abcjs-midi-start')
                if (playButton) {
                    playButton.click()
                }
            }

        } catch (error) {
            console.error("Error rendering ABC notation:", error)
            setIsPlaying(false)
        }
    }

    // Остановка воспроизведения
    const stopPlayback = () => {
        if (synthControlRef.current) {
            // В новой версии abcjs используем метод disable вместо stop
            try {
                // Находим кнопку остановки в элементах управления и кликаем на нее
                const audioControlElement = document.getElementById('audio-control')
                if (audioControlElement) {
                    const stopButton = audioControlElement.querySelector('.abcjs-btn.abcjs-midi-stop')
                    if (stopButton) {
                        stopButton.click()
                    } else {
                        // Если кнопки остановки нет, ищем кнопку паузы
                        const pauseButton = audioControlElement.querySelector('.abcjs-btn.abcjs-midi-pause')
                        if (pauseButton) {
                            pauseButton.click()
                        }
                    }
                }

                // Также останавливаем TimingCallbacks
                if (cursorRef.current) {
                    cursorRef.current.stop()
                }
            } catch (error) {
                console.warn("Error stopping playback:", error)
            }
        }
        setIsPlaying(false)
        setActiveNotes([])
    }

    // Функция для принудительной остановки
    const forceStopPlayback = () => {
        if (cursorRef.current) {
            cursorRef.current.stop()
        }
        setIsPlaying(false)
        setActiveNotes([])

        // Сбрасываем состояние элементов управления
        const audioControlElement = document.getElementById('audio-control')
        if (audioControlElement) {
            const progressIndicator = audioControlElement.querySelector('.abcjs-midi-progress-indicator')
            if (progressIndicator) {
                progressIndicator.style.width = '0%'
            }
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
                    <button onClick={forceStopPlayback}>
                        Остановить
                    </button>
                </div>
            </div>

            <div className="audio-controls">
                <h2>Управление воспроизведением</h2>
                <div id="audio-control"></div>
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

            <div className="examples">
                <h2>Примеры мелодий</h2>
                <div className="example-buttons">
                    <button onClick={() => setAbcText(`X:1
T:Twinkle Twinkle Little Star
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 | G G F F | E E D2 | G G F F | E E D2 | C C G G | A A G2 | F F E E | D D C2`)}>
                        Twinkle Twinkle
                    </button>
                    <button onClick={() => setAbcText(`X:1
T:Mary Had a Little Lamb
M:4/4
L:1/4
K:C
E D C D | E E E2 | D D D2 | E G G2 |
E D C D | E E E E | D D E D | C2 C2 |`)}>
                        Mary Had a Little Lamb
                    </button>
                    <button onClick={() => setAbcText(`X:1
T:Ode to Joy
M:4/4
L:1/4
K:C
E E F G | G F E D | C C D E | E D D2 |
E E F G | G F E D | C C D E | D C C2 |`)}>
                        Ode to Joy
                    </button>
                </div>
            </div>
        </div>
    )
}

export default App