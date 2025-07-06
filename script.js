// Состояние приложения
const state = {
    currentScreen: 'settings',
    currentPair: 'EUR/USD',
    currentTimeframe: 'M1',
    currentMarket: 'standard',
    cooldowns: {},
    cooldownInterval: null,
    currentSignal: null
};

// Элементы интерфейса
const elements = {
    settingsSection: document.querySelector('.settings-section'),
    getSignalBtn: document.getElementById('get-signal-btn'),
    signalPair: document.getElementById('signal-pair'),
    signalAction: document.getElementById('signal-action'),
    signalTimestamp: document.getElementById('signal-timestamp'),
    cooldownTimer: document.getElementById('cooldown-timer'),
    currencyPair: document.getElementById('currency-pair'),
    timeframe: document.getElementById('timeframe'),
    signalContent: document.getElementById('signal-content'),
    signalLoading: document.getElementById('signal-loading'),
    cooldownContainer: document.getElementById('cooldown-timer-container'),
    cooldownContent: document.getElementById('cooldown-content')
};

// Списки инструментов
const instruments = {
    standard: [
        "EUR/USD", "BTC/USD", "ETH/USD", "USD/RUB", 
        "USD/JPY", "GBP/USD", "USD/CHF", "AUD/USD", 
        "USD/CAD", "NZD/USD", "EUR/GBP", "EUR/JPY", 
        "GBP/JPY", "AUD/JPY", "CHF/JPY", "EUR/AUD", 
        "EUR/CAD", "GBP/AUD", "GBP/CAD", "AUD/CAD", 
        "AUD/CHF", "NZD/JPY", "NZD/CHF"
    ],
    otc: [
        "ZAR/USD OTC", "YER/USD OTC", "WTI Crude Oil OTC", "VIX OTC", 
        "VISA OTC", "USD/VND OTC", "USD/THB OTC", "USD/SGD OTC", 
        "USD/RUB OTC", "USD/PKR OTC", "USD/PHP OTC", 
        "USD/MXN OTC", "USD/JPY OTC", "USD/INR OTC", "USD/IDR OTC", 
        "USD/EGP OTC", "USD/DZD OTC", "USD/COP OTC", "USD/CNH OTC", 
        "USD/CLP OTC", "USD/CHF OTC", "USD/CAD OTC", "USD/BRL OTC", 
        "USD/BDT OTC", "USD/ARS OTC", "US100 OTC", "UAH/USD OTC", 
        "Toncoin OTC", "Tesla OTC", "TRON OTC", "TND/USD OTC", 
        "Solana OTC", "Silver OTC", "SP500 OTC", "SAR/CNY OTC", 
        "QAR/CNY OTC", "GBP/USD OTC", "EUR/GBP OTC", "EUR/JPY OTC", 
        "GBP/JPY OTC", "AUD/NZD OTC", "CAD/JPY OTC", "CHF/JPY OTC", 
        "EUR/CHF OTC", "AUD/CAD OTC", "AED/CNY OTC"
    ]
};

// Доступные таймфреймы
const timeframes = {
    standard: ["M1", "M3", "M30", "H1"],
    otc: ["S5", "S15", "S30", "M1", "M3", "M30", "H1"]
};

// Расписание бирж (время UTC)
const marketSchedule = {
    asia: {
        TSE: { open: 0, close: 6 },
        SSE: { open: 1.5, close: 7.5 },
        HKEX: { open: 1.5, close: 7.5 }
    },
    europe: {
        LSE: { open: 8, close: 16.5 },
        Deutsche: { open: 8, close: 16.5 },
        Euronext: { open: 8, close: 16.5 }
    },
    america: {
        NYSE: { open: 14.5, close: 21 },
        NASDAQ: { open: 14.5, close: 21 }
    }
};

// Получение следующего времени открытия рынка
function getNextMarketOpenTime() {
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const utcDay = now.getUTCDay();

    const createDate = (baseDate, hoursFloat) => {
        const date = new Date(baseDate);
        const hours = Math.floor(hoursFloat);
        const minutes = Math.round((hoursFloat - hours) * 60);
        date.setUTCHours(hours, minutes, 0, 0);
        return date;
    };

    let openTimes = [];
    for (const region of Object.values(marketSchedule)) {
        for (const exchange of Object.values(region)) {
            openTimes.push(exchange.open);
        }
    }
    openTimes.sort((a, b) => a - b);

    const getNextBusinessDay = (date, offset) => {
        const nextDate = new Date(date);
        nextDate.setUTCDate(date.getUTCDate() + offset);
        const nextDay = nextDate.getUTCDay();
        if (nextDay === 0 || nextDay === 6) {
            return getNextBusinessDay(date, offset + 1);
        }
        return nextDate;
    };

    if (utcDay >= 1 && utcDay <= 5) {
        for (const time of openTimes) {
            if (time > utcHours) {
                return createDate(now, time);
            }
        }
        const nextBusinessDay = getNextBusinessDay(now, 1);
        const nextTime = Math.min(...openTimes);
        return createDate(nextBusinessDay, nextTime);
    } else {
        const nextBusinessDay = getNextBusinessDay(now, 1);
        const nextTime = Math.min(...openTimes);
        return createDate(nextBusinessDay, nextTime);
    }
}

// Форматирование даты в DD.MM.YYYY
function formatDate(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
}

// Проверка, открыт ли рынок
function isMarketOpen() {
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const utcDay = now.getUTCDay();
    
    if (utcDay === 0 || utcDay === 6) return false;
    
    for (const region of Object.values(marketSchedule)) {
        for (const exchange of Object.values(region)) {
            if (utcHours >= exchange.open && utcHours < exchange.close) {
                return true;
            }
        }
    }
    
    return false;
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    elements.getSignalBtn.addEventListener('click', startSignalProcess);
    
    elements.currencyPair.addEventListener('change', (e) => {
        state.currentPair = e.target.value;
        resetSignalDisplay();
        updateCooldownDisplay();
        updateMarketStatus();
    });
    
    elements.timeframe.addEventListener('change', (e) => {
        state.currentTimeframe = e.target.value;
        resetSignalDisplay();
        updateCooldownDisplay();
    });
    
    document.querySelectorAll('.market-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.market-tab').forEach(t => {
                t.classList.remove('active');
            });
            tab.classList.add('active');
            state.currentMarket = tab.dataset.market;
            updateInstruments(state.currentMarket);
            updateTimeframes(state.currentMarket);
            resetSignalDisplay();
            updateCooldownDisplay();
            updateMarketStatus();
        });
    });
    
    updateInstruments('standard');
    updateTimeframes('standard');
    document.querySelector('.market-tab[data-market="standard"]').classList.add('active');
    document.querySelector('.market-tab[data-market="otc"]').classList.remove('active');
    
    resetSignalDisplay();
    updateMarketStatus();
    
    state.cooldownInterval = setInterval(() => {
        updateMarketStatus();
        if (state.currentMarket !== 'standard' || isMarketOpen()) {
            updateCooldownDisplay();
        }
    }, 1000);
});

// Обновить статус рынка
function updateMarketStatus() {
    const isClosed = state.currentMarket === 'standard' && !isMarketOpen();
    
    if (isClosed) {
        elements.getSignalBtn.disabled = true;
        elements.getSignalBtn.textContent = 'Market Closed';
        
        const nextOpenDate = getNextMarketOpenTime();
        const formattedDate = formatDate(nextOpenDate);
        
        elements.cooldownContent.innerHTML = `
            <div class="market-closed-content">
                <div class="warning-text">The market will open on ${formattedDate}</div>
                <div class="tech-connection">
                    <div class="connection-line"></div>
                    <div class="connection-pulse"></div>
                </div>
                <button class="switch-otc-btn">⇄ Trade OTC</button>
            </div>
        `;
        elements.cooldownContainer.classList.add('market-closed');
        
        const otcButton = elements.cooldownContent.querySelector('.switch-otc-btn');
        otcButton.addEventListener('click', function() {
            document.querySelector('.market-tab[data-market="otc"]').click();
        });
    } else {
        elements.getSignalBtn.disabled = false;
        elements.getSignalBtn.textContent = 'Get Signal';
        elements.cooldownContainer.classList.remove('market-closed');
        elements.cooldownContent.innerHTML = '<div class="timer-value" id="cooldown-timer">--:--</div>';
        elements.cooldownTimer = document.getElementById('cooldown-timer');
        updateCooldownDisplay();
    }
}

// Обновить список таймфреймов
function updateTimeframes(market) {
    const tfList = timeframes[market];
    const select = elements.timeframe;
    
    select.innerHTML = '';
    
    tfList.forEach(tf => {
        const option = document.createElement('option');
        option.value = tf;
        option.textContent = tf;
        select.appendChild(option);
    });
    
    if (tfList.includes(state.currentTimeframe)) {
        select.value = state.currentTimeframe;
    } else {
        state.currentTimeframe = tfList[0];
        select.value = tfList[0];
    }
}

// Начать процесс получения сигнала
function startSignalProcess() {
    if (state.currentMarket === 'standard' && !isMarketOpen()) {
        return;
    }
    
    const key = getCurrentKey();
    
    if (isOnCooldown(key)) {
        return;
    }
    
    showSignalLoading();
    
    let delay;
    const tf = state.currentTimeframe;
    
    if (tf.startsWith('S')) {
        delay = Math.floor(Math.random() * 3000) + 1000;
    } else if (tf === 'M1' || tf === 'M3') {
        delay = Math.floor(Math.random() * 3000) + 4000;
    } else if (tf === 'M30') {
        delay = Math.floor(Math.random() * 9000) + 6000;
    } else if (tf === 'H1') {
        delay = Math.floor(Math.random() * 15000) + 10000;
    } else {
        delay = Math.floor(Math.random() * 3000) + 4000;
    }
    
    setTimeout(() => {
        const isBuy = Math.random() > 0.5;
        const currentTime = getCurrentTime();
        
        state.currentSignal = {
            key: key,
            pair: state.currentPair,
            action: isBuy ? 'Buy' : 'Sell',
            isBuy: isBuy,
            timestamp: currentTime,
            delay: delay
        };
        
        elements.signalPair.textContent = state.currentPair;
        elements.signalAction.textContent = isBuy ? 'Buy' : 'Sell';
        elements.signalAction.className = `signal-action ${isBuy ? 'buy' : 'sell'}`;
        elements.signalTimestamp.textContent = currentTime;
        
        startCooldown(key);
        updateCooldownDisplay();
        hideSignalLoading();
    }, delay);
}

// Получить уникальный ключ
function getCurrentKey() {
    return `${state.currentPair}|${state.currentTimeframe}`;
}

// Проверить cooldown
function isOnCooldown(key) {
    const cooldownEnd = state.cooldowns[key];
    return cooldownEnd && cooldownEnd > Date.now();
}

// Запустить cooldown
function startCooldown(key) {
    const duration = parseTimeframe(state.currentTimeframe);
    state.cooldowns[key] = Date.now() + duration;
}

// Обновить отображение cooldown
function updateCooldownDisplay() {
    if (!elements.cooldownTimer) {
        return;
    }
    
    const key = getCurrentKey();
    const cooldownEnd = state.cooldowns[key];
    const now = Date.now();
    
    if (cooldownEnd && cooldownEnd > now) {
        const remaining = Math.max(0, cooldownEnd - now);
        const seconds = Math.ceil(remaining / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        elements.getSignalBtn.textContent = `Get Signal (${seconds}s)`;
        elements.getSignalBtn.disabled = true;
        
        elements.cooldownTimer.textContent = 
            `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    } else {
        if (state.currentSignal && state.currentSignal.key === key) {
            resetSignalDisplay();
            state.currentSignal = null;
        }
        
        elements.getSignalBtn.textContent = 'Get Signal';
        elements.getSignalBtn.disabled = false;
        elements.cooldownTimer.textContent = '--:--';
    }
}

// Показать загрузку
function showSignalLoading() {
    elements.signalContent.style.opacity = '0';
    elements.signalContent.style.pointerEvents = 'none';
    elements.signalLoading.style.display = 'flex';
    elements.cooldownContainer.style.visibility = 'hidden';
}

// Скрыть загрузку
function hideSignalLoading() {
    elements.signalContent.style.opacity = '1';
    elements.signalContent.style.pointerEvents = 'auto';
    elements.signalLoading.style.display = 'none';
    elements.cooldownContainer.style.visibility = 'visible';
}

// Обновить инструменты
function updateInstruments(market) {
    elements.currencyPair.innerHTML = '';
    instruments[market].forEach(pair => {
        const option = document.createElement('option');
        option.value = pair;
        option.textContent = pair;
        elements.currencyPair.appendChild(option);
    });
    
    state.currentPair = instruments[market][0];
    elements.currencyPair.value = state.currentPair;
}

// Преобразовать timeframe в миллисекунды
function parseTimeframe(timeframe) {
    const type = timeframe.charAt(0);
    const value = parseInt(timeframe.substring(1));
    
    if (type === 'S') {
        return value * 1000;
    } else if (type === 'M') {
        return value * 60 * 1000;
    } else if (type === 'H') {
        return value * 60 * 60 * 1000;
    }
    
    return 60000;
}

// Получить текущее время
function getCurrentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

// Сбросить отображение сигнала
function resetSignalDisplay() {
    elements.signalPair.textContent = '--';
    elements.signalAction.textContent = '--';
    elements.signalAction.className = 'signal-action';
    elements.signalTimestamp.textContent = '--:--:--';
    if (elements.cooldownTimer) {
        elements.cooldownTimer.textContent = '--:--';
    }
    hideSignalLoading();
}