// Состояние приложения
const state = {
    currentScreen: 'settings',
    currentPair: 'EUR/USD',
    currentTimeframe: '1 minute',
    currentMarket: 'standard',
    cooldowns: {},
    cooldownInterval: null
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
    marketClosedMessage: document.getElementById('market-closed-message')
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
    standard: [
        "1 minute", 
        "3 minutes", 
        "30 minutes", 
        "1 hour"
    ],
    otc: [
        "5 seconds", 
        "15 seconds", 
        "30 seconds", 
        "1 minute", 
        "3 minutes", 
        "30 minutes", 
        "1 hour"
    ]
};

// Расписание бирж (время UTC)
const marketSchedule = {
    // Азиатские биржи
    asia: {
        TSE: { open: 0, close: 6 },   // Tokyo: 9:00 JST = UTC+9 -> 00:00 UTC
        SSE: { open: 1.5, close: 7.5 }, // Shanghai: 9:30 CST = UTC+8 -> 01:30 UTC
        HKEX: { open: 1.5, close: 7.5 } // Hong Kong: 9:30 HKT = UTC+8 -> 01:30 UTC
    },
    // Европейские биржи
    europe: {
        LSE: { open: 8, close: 16.5 },   // London: 8:00 GMT = 08:00 UTC
        Deutsche: { open: 8, close: 16.5 }, // Frankfurt: 9:00 CET = UTC+1 -> 08:00 UTC
        Euronext: { open: 8, close: 16.5 }  // Paris: 9:00 CET = UTC+1 -> 08:00 UTC
    },
    // Американские биржи
    america: {
        NYSE: { open: 14.5, close: 21 }, // New York: 9:30 EST = UTC-5 -> 14:30 UTC
        NASDAQ: { open: 14.5, close: 21 } // NASDAQ: 9:30 EST = UTC-5 -> 14:30 UTC
    }
};

// Проверка, открыт ли рынок для обычных пар
function isMarketOpen() {
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const utcDay = now.getUTCDay(); // 0 - воскресенье, 6 - суббота
    
    // Проверка выходных
    if (utcDay === 0 || utcDay === 6) return false;
    
    // Проверка торговых сессий
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
        updateCooldownDisplay();
        updateMarketStatus();
    });
    
    elements.timeframe.addEventListener('change', (e) => {
        state.currentTimeframe = e.target.value;
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
            updateCooldownDisplay();
            updateMarketStatus();
        });
    });
    
    // Инициализация
    updateInstruments('standard');
    updateTimeframes('standard');
    document.querySelector('.market-tab[data-market="standard"]').classList.add('active');
    document.querySelector('.market-tab[data-market="otc"]').classList.remove('active');
    
    resetSignalDisplay();
    updateMarketStatus();
    
    // Запускаем интервал для обновления
    state.cooldownInterval = setInterval(() => {
        updateCooldownDisplay();
        updateMarketStatus();
    }, 1000);
});

// Обновить статус рынка (открыт/закрыт)
function updateMarketStatus() {
    const isClosed = state.currentMarket === 'standard' && !isMarketOpen();
    
    if (isClosed) {
        elements.getSignalBtn.disabled = true;
        elements.getSignalBtn.textContent = 'Market Closed';
        elements.marketClosedMessage.style.display = 'flex';
        elements.cooldownTimer.textContent = '--:--';
    } else {
        elements.marketClosedMessage.style.display = 'none';
        updateCooldownDisplay();
    }
}

// Обновить список таймфреймов
function updateTimeframes(market) {
    const tfList = timeframes[market];
    const select = elements.timeframe;
    
    // Очищаем список
    select.innerHTML = '';
    
    // Добавляем новые опции
    tfList.forEach(tf => {
        const option = document.createElement('option');
        option.value = tf;
        option.textContent = tf;
        select.appendChild(option);
    });
    
    // Устанавливаем текущий таймфрейм
    if (tfList.includes(state.currentTimeframe)) {
        select.value = state.currentTimeframe;
    } else {
        state.currentTimeframe = tfList[0];
        select.value = tfList[0];
    }
}

// Начать процесс получения сигнала
function startSignalProcess() {
    // Проверяем, закрыт ли рынок
    if (state.currentMarket === 'standard' && !isMarketOpen()) {
        return;
    }
    
    const key = getCurrentKey();
    
    if (isOnCooldown(key)) {
        return;
    }
    
    elements.signalTimestamp.textContent = getCurrentTime();
    showSignalLoading();
    
    setTimeout(() => {
        const isBuy = Math.random() > 0.5;
        
        elements.signalPair.textContent = state.currentPair;
        elements.signalAction.textContent = isBuy ? 'Buy' : 'Sell';
        elements.signalAction.className = `signal-action ${isBuy ? 'buy' : 'sell'}`;
        
        startCooldown(key);
        updateCooldownDisplay();
        hideSignalLoading();
    }, 1000);
}

// Получить уникальный ключ для текущей комбинации
function getCurrentKey() {
    return `${state.currentPair}|${state.currentTimeframe}`;
}

// Проверить, действует ли cooldown для комбинации
function isOnCooldown(key) {
    const cooldownEnd = state.cooldowns[key];
    return cooldownEnd && cooldownEnd > Date.now();
}

// Запустить cooldown для конкретной комбинации
function startCooldown(key) {
    const duration = parseTimeframe(state.currentTimeframe);
    state.cooldowns[key] = Date.now() + duration;
}

// Обновить отображение cooldown
function updateCooldownDisplay() {
    // Если рынок закрыт, не обновляем
    if (state.currentMarket === 'standard' && !isMarketOpen()) {
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
        elements.getSignalBtn.textContent = 'Get Signal';
        elements.getSignalBtn.disabled = false;
        elements.cooldownTimer.textContent = '--:--';
    }
}

// Показать загрузку в области сигнала
function showSignalLoading() {
    elements.signalContent.style.opacity = '0';
    elements.signalContent.style.pointerEvents = 'none';
    elements.signalLoading.style.display = 'flex';
    elements.cooldownTimer.style.visibility = 'hidden';
}

// Скрыть загрузку в области сигнала
function hideSignalLoading() {
    elements.signalContent.style.opacity = '1';
    elements.signalContent.style.pointerEvents = 'auto';
    elements.signalLoading.style.display = 'none';
    elements.cooldownTimer.style.visibility = 'visible';
}

// Обновить инструменты при смене рынка
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
    const value = parseInt(timeframe);
    
    if (timeframe.includes('second')) {
        return value * 1000;
    }
    
    if (timeframe.includes('minute')) {
        return value * 60 * 1000;
    }
    
    if (timeframe.includes('hour')) {
        return value * 60 * 60 * 1000;
    }
    
    return 60000; // По умолчанию 1 минута
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
    elements.cooldownTimer.textContent = '--:--';
    hideSignalLoading();
}
