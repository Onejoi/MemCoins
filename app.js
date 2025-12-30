/* ============================================
   🔥 МЕМКОИНЫ - NFT Exchange App
   Main JavaScript Logic
   ============================================ */

// ============================================
// Data & State
// ============================================

const MEME_TYPES = [
    { id: 'fighter', name: 'Бомж Файтер', emoji: '🥊', image: 'images/fighter.png', basePrice: 800, color: '#ef4444' },
    { id: 'cat', name: 'Грустный Кот', emoji: '😿', image: null, basePrice: 400, color: '#3b82f6' },
    { id: 'trader', name: 'Успешный Трейдер', emoji: '📈', image: null, basePrice: 600, color: '#22c55e' },
    { id: 'hacker', name: 'Дедушка Хакер', emoji: '👴', image: null, basePrice: 300, color: '#a855f7' },
    { id: 'dog', name: 'Собака в Костюме', emoji: '🐕', image: null, basePrice: 500, color: '#f59e0b' }
];

const RARITIES = {
    common: { name: 'Common', multiplier: 1.0, color: '#9aa4af' },
    rare: { name: 'Rare', multiplier: 1.5, color: '#3b82f6' },
    epic: { name: 'Epic', multiplier: 2.5, color: '#a855f7' },
    legendary: { name: 'Legendary', multiplier: 5.0, color: '#f59e0b' }
};

// App State
const state = {
    currentPair: 'fighter',
    orderSide: 'buy',
    orderType: 'market',
    balance: 1250.00,
    collection: [],
    prices: {},
    priceHistory: {},
    orderbook: {},
    trades: {}
};

// ============================================
// Initialize App
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initTelegram();
    initPrices();
    initOrderbook();
    initTrades();
    initCollection();

    renderTradingPairs();
    renderOrderbook();
    renderTrades();
    renderCollection();

    initChart();
    setupEventListeners();

    // Start real-time updates
    setInterval(updatePrices, 3000);
    setInterval(addRandomTrade, 5000);
});

// ============================================
// Telegram Web App Integration
// ============================================

function initTelegram() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();

        // Set theme
        document.body.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#0b0e11');

        // Get user data
        if (tg.initDataUnsafe.user) {
            const user = tg.initDataUnsafe.user;
            document.getElementById('profileName').textContent = user.first_name || 'Трейдер';
        }
    }
}

// ============================================
// Price System
// ============================================

function initPrices() {
    MEME_TYPES.forEach(meme => {
        // Random modifier between 0.5 and 2.0
        const modifier = 0.5 + Math.random() * 1.5;
        state.prices[meme.id] = {
            current: Math.round(meme.basePrice * modifier),
            change24h: (Math.random() - 0.3) * 30, // -10% to +20%
            high24h: 0,
            low24h: 0,
            volume24h: Math.round(50000 + Math.random() * 200000)
        };

        // Generate price history
        state.priceHistory[meme.id] = generatePriceHistory(meme.basePrice);

        // Set high/low
        const history = state.priceHistory[meme.id];
        state.prices[meme.id].high24h = Math.max(...history.map(c => c.high));
        state.prices[meme.id].low24h = Math.min(...history.map(c => c.low));
    });
}

function generatePriceHistory(basePrice) {
    const candles = [];
    let price = basePrice * (0.5 + Math.random());
    const now = Date.now();

    for (let i = 100; i >= 0; i--) {
        const time = Math.floor((now - i * 15 * 60 * 1000) / 1000);
        const volatility = 0.02 + Math.random() * 0.03;

        const open = price;
        const change = (Math.random() - 0.45) * volatility;
        const close = price * (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);

        candles.push({
            time,
            open: Math.round(open * 100) / 100,
            high: Math.round(high * 100) / 100,
            low: Math.round(low * 100) / 100,
            close: Math.round(close * 100) / 100
        });

        price = close;
    }

    return candles;
}

function updatePrices() {
    MEME_TYPES.forEach(meme => {
        const priceData = state.prices[meme.id];
        const change = (Math.random() - 0.48) * 0.02;
        priceData.current = Math.round(priceData.current * (1 + change));
        priceData.change24h += change * 100;

        // Add new candle
        const history = state.priceHistory[meme.id];
        const lastCandle = history[history.length - 1];
        const now = Math.floor(Date.now() / 1000);

        if (now - lastCandle.time > 60) {
            const newCandle = {
                time: now,
                open: lastCandle.close,
                high: priceData.current * 1.005,
                low: priceData.current * 0.995,
                close: priceData.current
            };
            history.push(newCandle);

            if (state.currentPair === meme.id && window.candleSeries) {
                window.candleSeries.update(newCandle);
            }
        }
    });

    renderTradingPairs();
    updateCurrentPairInfo();
    renderOrderbook();
}

// ============================================
// Order Book
// ============================================

function initOrderbook() {
    MEME_TYPES.forEach(meme => {
        state.orderbook[meme.id] = generateOrderbook(state.prices[meme.id].current);
    });
}

function generateOrderbook(midPrice) {
    const asks = [];
    const bids = [];

    // Generate asks (sell orders)
    for (let i = 0; i < 8; i++) {
        const price = midPrice * (1.005 + i * 0.008 + Math.random() * 0.005);
        asks.push({
            price: Math.round(price * 100) / 100,
            amount: Math.floor(1 + Math.random() * 15),
            total: 0
        });
    }

    // Generate bids (buy orders)
    for (let i = 0; i < 8; i++) {
        const price = midPrice * (0.995 - i * 0.008 - Math.random() * 0.005);
        bids.push({
            price: Math.round(price * 100) / 100,
            amount: Math.floor(1 + Math.random() * 15),
            total: 0
        });
    }

    // Sort
    asks.sort((a, b) => a.price - b.price);
    bids.sort((a, b) => b.price - a.price);

    // Calculate totals
    asks.reduce((sum, order) => { order.total = sum + order.amount; return order.total; }, 0);
    bids.reduce((sum, order) => { order.total = sum + order.amount; return order.total; }, 0);

    return { asks, bids };
}

function renderOrderbook() {
    const book = state.orderbook[state.currentPair];
    if (!book) return;

    const price = state.prices[state.currentPair].current;
    const maxTotal = Math.max(
        ...book.asks.map(o => o.total),
        ...book.bids.map(o => o.total)
    );

    // Render asks (reversed to show highest at top)
    const asksHtml = [...book.asks].reverse().map(order => `
        <div class="orderbook-row">
            <span class="price">${formatPrice(order.price)}</span>
            <span>${order.amount}</span>
            <span>${formatPrice(order.price * order.amount)}</span>
            <div class="depth" style="width: ${(order.total / maxTotal) * 100}%"></div>
        </div>
    `).join('');

    // Render bids
    const bidsHtml = book.bids.map(order => `
        <div class="orderbook-row">
            <span class="price">${formatPrice(order.price)}</span>
            <span>${order.amount}</span>
            <span>${formatPrice(order.price * order.amount)}</span>
            <div class="depth" style="width: ${(order.total / maxTotal) * 100}%"></div>
        </div>
    `).join('');

    document.getElementById('orderbookAsks').innerHTML = asksHtml;
    document.getElementById('orderbookBids').innerHTML = bidsHtml;
    document.getElementById('spreadPrice').textContent = formatPrice(price);
}

// ============================================
// Trades
// ============================================

function initTrades() {
    MEME_TYPES.forEach(meme => {
        state.trades[meme.id] = [];
        for (let i = 0; i < 15; i++) {
            addTrade(meme.id, false);
        }
    });
}

function addTrade(memeId, render = true) {
    const price = state.prices[memeId].current;
    const trade = {
        price: price * (0.995 + Math.random() * 0.01),
        amount: Math.floor(1 + Math.random() * 5),
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        time: new Date()
    };

    state.trades[memeId].unshift(trade);
    if (state.trades[memeId].length > 20) {
        state.trades[memeId].pop();
    }

    if (render && memeId === state.currentPair) {
        renderTrades();
    }
}

function addRandomTrade() {
    const memeId = MEME_TYPES[Math.floor(Math.random() * MEME_TYPES.length)].id;
    addTrade(memeId);

    // Update orderbook
    state.orderbook[memeId] = generateOrderbook(state.prices[memeId].current);
    if (memeId === state.currentPair) {
        renderOrderbook();
    }
}

function renderTrades() {
    const trades = state.trades[state.currentPair] || [];

    const html = trades.slice(0, 10).map(trade => `
        <div class="trade-row">
            <span class="price ${trade.side}">${formatPrice(trade.price)}</span>
            <span>${trade.amount}</span>
            <span class="time">${formatTime(trade.time)}</span>
        </div>
    `).join('');

    document.getElementById('tradesList').innerHTML = html;
}

// ============================================
// Trading Pairs
// ============================================

function renderTradingPairs() {
    const html = MEME_TYPES.map(meme => {
        const priceData = state.prices[meme.id];
        const changeClass = priceData.change24h >= 0 ? 'positive' : 'negative';
        const changeSign = priceData.change24h >= 0 ? '+' : '';

        // Use image if available, otherwise emoji
        const iconHtml = meme.image
            ? `<img src="${meme.image}" class="meme-icon" alt="${meme.name}">`
            : `<span class="emoji">${meme.emoji}</span>`;

        return `
            <div class="pair-item ${state.currentPair === meme.id ? 'active' : ''}" 
                 onclick="selectPair('${meme.id}')">
                ${iconHtml}
                <div class="info">
                    <div class="name">${meme.id.toUpperCase()}</div>
                    <div class="price">${formatPrice(priceData.current)}</div>
                </div>
                <span class="change ${changeClass}">${changeSign}${priceData.change24h.toFixed(1)}%</span>
            </div>
        `;
    }).join('');

    document.getElementById('pairsList').innerHTML = html;
}

function selectPair(pairId) {
    state.currentPair = pairId;
    renderTradingPairs();
    updateCurrentPairInfo();
    renderOrderbook();
    renderTrades();
    updateChart();
    updateOrderForm();
}

function updateCurrentPairInfo() {
    const meme = MEME_TYPES.find(m => m.id === state.currentPair);
    const priceData = state.prices[state.currentPair];
    const changeClass = priceData.change24h >= 0 ? 'positive' : 'negative';
    const changeSign = priceData.change24h >= 0 ? '+' : '';

    const iconHtml = meme.image
        ? `<img src="${meme.image}" class="pair-icon" alt="${meme.name}">`
        : meme.emoji;

    document.getElementById('currentEmoji').innerHTML = iconHtml;
    document.getElementById('currentPairName').textContent = meme.id.toUpperCase();
    document.getElementById('currentPrice').textContent = formatPrice(priceData.current);

    const changeEl = document.getElementById('currentChange');
    changeEl.textContent = `${changeSign}${priceData.change24h.toFixed(1)}%`;
    changeEl.className = `pair-change ${changeClass}`;

    document.getElementById('high24h').textContent = formatPrice(priceData.high24h);
    document.getElementById('low24h').textContent = formatPrice(priceData.low24h);
    document.getElementById('volume24h').textContent = '$' + priceData.volume24h.toLocaleString();
}

// ============================================
// Chart (Lightweight Charts)
// ============================================

let chart = null;
let candleSeries = null;

function initChart() {
    const container = document.getElementById('chartContainer');

    // Get actual container dimensions
    const containerWidth = container.clientWidth || window.innerWidth - 20;
    const containerHeight = Math.min(container.clientHeight || 250, 300);

    chart = LightweightCharts.createChart(container, {
        width: containerWidth,
        height: containerHeight,
        layout: {
            background: { type: 'solid', color: '#1e2329' },
            textColor: '#848e9c'
        },
        grid: {
            vertLines: { color: '#2b3139' },
            horzLines: { color: '#2b3139' }
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal
        },
        rightPriceScale: {
            borderColor: '#2b3139'
        },
        timeScale: {
            borderColor: '#2b3139',
            timeVisible: true
        },
        handleScroll: {
            mouseWheel: false,
            pressedMouseMove: true
        },
        handleScale: {
            axisPressedMouseMove: false,
            mouseWheel: false,
            pinch: false
        }
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: '#0ecb81',
        downColor: '#f6465d',
        borderUpColor: '#0ecb81',
        borderDownColor: '#f6465d',
        wickUpColor: '#0ecb81',
        wickDownColor: '#f6465d'
    });

    updateChart();

    // Use ResizeObserver for instant resize
    if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    chart.applyOptions({
                        width: width,
                        height: Math.min(height, 300)
                    });
                    chart.timeScale().fitContent();
                }
            }
        });
        resizeObserver.observe(container);
    } else {
        // Fallback for older browsers
        window.addEventListener('resize', () => {
            const newWidth = container.clientWidth;
            const newHeight = Math.min(container.clientHeight, 300);
            chart.applyOptions({ width: newWidth, height: newHeight });
            chart.timeScale().fitContent();
        });
    }

    window.candleSeries = candleSeries;
}

function updateChart() {
    const history = state.priceHistory[state.currentPair];
    if (history && candleSeries) {
        candleSeries.setData(history);
        chart.timeScale().fitContent();
    }
}

// ============================================
// Collection
// ============================================

function initCollection() {
    // Add some initial cards
    const rarities = ['common', 'common', 'common', 'rare', 'rare', 'epic'];

    for (let i = 0; i < 12; i++) {
        const meme = MEME_TYPES[Math.floor(Math.random() * MEME_TYPES.length)];
        const rarity = rarities[Math.floor(Math.random() * rarities.length)];

        state.collection.push({
            id: `card_${i}`,
            memeType: meme.id,
            rarity: rarity,
            acquiredAt: new Date()
        });
    }
}

function renderCollection() {
    const html = state.collection.map(card => {
        const meme = MEME_TYPES.find(m => m.id === card.memeType);
        const rarity = RARITIES[card.rarity];
        const price = state.prices[card.memeType].current * rarity.multiplier;

        const iconHtml = meme.image
            ? `<img src="${meme.image}" class="card-icon" alt="${meme.name}">`
            : `<div class="emoji">${meme.emoji}</div>`;

        return `
            <div class="card-item ${card.rarity}">
                ${iconHtml}
                <div class="name">${meme.name}</div>
                <div class="rarity">${rarity.name}</div>
                <div class="value">${formatPrice(price)}</div>
            </div>
        `;
    }).join('');

    document.getElementById('collectionGrid').innerHTML = html;

    // Update stats
    const totalValue = state.collection.reduce((sum, card) => {
        const meme = MEME_TYPES.find(m => m.id === card.memeType);
        const rarity = RARITIES[card.rarity];
        return sum + state.prices[card.memeType].current * rarity.multiplier;
    }, 0);

    document.getElementById('totalCards').textContent = `${state.collection.length} карточек`;
    document.getElementById('totalValue').textContent = `~${formatPrice(totalValue)}`;

    // Render battle cards
    renderBattleCards();
}

function renderBattleCards() {
    const html = state.collection.map(card => {
        const meme = MEME_TYPES.find(m => m.id === card.memeType);
        const rarity = RARITIES[card.rarity];

        const iconHtml = meme.image
            ? `<img src="${meme.image}" class="battle-icon" alt="${meme.name}">`
            : `<div class="emoji">${meme.emoji}</div>`;

        return `
            <div class="battle-card" data-card-id="${card.id}" onclick="selectBattleCard('${card.id}')">
                ${iconHtml}
                <div class="name">${rarity.name}</div>
            </div>
        `;
    }).join('');

    document.getElementById('battleSelect').innerHTML = html;
}

// ============================================
// Order Form
// ============================================

function setupEventListeners() {
    // Order type tabs
    document.querySelectorAll('.order-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.orderSide = tab.dataset.side;
            updateOrderForm();
        });
    });

    // Order type (market/limit)
    document.querySelectorAll('.order-type input').forEach(input => {
        input.addEventListener('change', () => {
            document.querySelectorAll('.order-type').forEach(t => t.classList.remove('active'));
            input.parentElement.classList.add('active');
            state.orderType = input.value;

            document.getElementById('limitPriceGroup').style.display =
                input.value === 'limit' ? 'flex' : 'none';

            updateOrderForm();
        });
    });

    // Amount input
    document.getElementById('orderAmount').addEventListener('input', updateOrderForm);
    document.getElementById('limitPrice').addEventListener('input', updateOrderForm);

    // Quick buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const percent = parseInt(btn.dataset.percent);
            const maxCards = Math.floor(state.balance / state.prices[state.currentPair].current);
            const amount = Math.floor(maxCards * percent / 100);
            document.getElementById('orderAmount').value = Math.max(1, amount);
            updateOrderForm();
        });
    });

    // Submit order
    document.getElementById('submitOrder').addEventListener('click', submitOrder);

    // Timeframe buttons
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Here you would regenerate chart data for different timeframe
        });
    });
}

function updateOrderForm() {
    const meme = MEME_TYPES.find(m => m.id === state.currentPair);
    const price = state.orderType === 'limit'
        ? parseFloat(document.getElementById('limitPrice').value) || state.prices[state.currentPair].current
        : state.prices[state.currentPair].current;
    const amount = parseInt(document.getElementById('orderAmount').value) || 1;
    const total = price * amount;

    document.getElementById('orderTotal').textContent = formatPrice(total);

    const submitBtn = document.getElementById('submitOrder');
    submitBtn.textContent = state.orderSide === 'buy'
        ? `Купить ${meme.id.toUpperCase()}`
        : `Продать ${meme.id.toUpperCase()}`;
    submitBtn.className = `order-submit ${state.orderSide}-btn`;
}

function submitOrder() {
    const amount = parseInt(document.getElementById('orderAmount').value) || 1;
    const price = state.prices[state.currentPair].current;
    const total = price * amount;

    if (state.orderSide === 'buy') {
        if (total > state.balance) {
            alert('Недостаточно средств!');
            return;
        }

        state.balance -= total;

        // Add cards to collection
        for (let i = 0; i < amount; i++) {
            const rarity = getRandomRarity();
            state.collection.push({
                id: `card_${Date.now()}_${i}`,
                memeType: state.currentPair,
                rarity: rarity,
                acquiredAt: new Date()
            });
        }

        alert(`✅ Куплено ${amount} карточек за ${formatPrice(total)}`);
    } else {
        // Sell logic - remove cards
        const cardsToSell = state.collection
            .filter(c => c.memeType === state.currentPair)
            .slice(0, amount);

        if (cardsToSell.length < amount) {
            alert('Недостаточно карточек для продажи!');
            return;
        }

        cardsToSell.forEach(card => {
            const idx = state.collection.findIndex(c => c.id === card.id);
            if (idx !== -1) state.collection.splice(idx, 1);
        });

        state.balance += total * 0.98; // 2% fee
        alert(`✅ Продано ${amount} карточек за ${formatPrice(total * 0.98)}`);
    }

    updateBalance();
    renderCollection();
}

function getRandomRarity() {
    const rand = Math.random();
    if (rand < 0.6) return 'common';
    if (rand < 0.85) return 'rare';
    if (rand < 0.97) return 'epic';
    return 'legendary';
}

// ============================================
// Chests
// ============================================

function openChest(type) {
    const modal = document.getElementById('chestModal');
    const animation = document.getElementById('chestAnimation');
    const reveal = document.getElementById('cardReveal');

    modal.classList.add('active');
    animation.style.display = 'block';
    reveal.style.display = 'none';

    // Determine rarity based on chest type
    let rarity;
    const rand = Math.random();

    if (type === 'free') {
        if (rand < 0.5) rarity = 'common';
        else if (rand < 0.8) rarity = 'rare';
        else if (rand < 0.95) rarity = 'epic';
        else rarity = 'legendary';
    } else if (type === 'premium') {
        if (rand < 0.2) rarity = 'common';
        else if (rand < 0.6) rarity = 'rare';
        else if (rand < 0.9) rarity = 'epic';
        else rarity = 'legendary';
    } else { // legendary chest
        if (rand < 0.7) rarity = 'epic';
        else rarity = 'legendary';
    }

    const meme = MEME_TYPES[Math.floor(Math.random() * MEME_TYPES.length)];

    // Add to collection
    state.collection.push({
        id: `card_${Date.now()}`,
        memeType: meme.id,
        rarity: rarity,
        acquiredAt: new Date()
    });

    // Animate
    setTimeout(() => {
        animation.style.display = 'none';
        reveal.style.display = 'block';

        const iconHtml = meme.image
            ? `<img src="${meme.image}" class="revealed-icon" alt="${meme.name}">`
            : meme.emoji;

        document.getElementById('revealedCard').innerHTML = iconHtml;
        const rarityEl = document.getElementById('cardRarity');
        rarityEl.textContent = RARITIES[rarity].name;
        rarityEl.className = `card-rarity ${rarity}`;

        renderCollection();
    }, 1500);
}

function closeModal() {
    document.getElementById('chestModal').classList.remove('active');
}

// ============================================
// Battles
// ============================================

let selectedBattleCard = null;

function selectBattleCard(cardId) {
    selectedBattleCard = cardId;

    document.querySelectorAll('.battle-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.cardId === cardId);
    });

    document.getElementById('startBattle').disabled = false;
}

document.getElementById('startBattle')?.addEventListener('click', () => {
    if (!selectedBattleCard) return;

    const card = state.collection.find(c => c.id === selectedBattleCard);
    if (!card) return;

    const meme = MEME_TYPES.find(m => m.id === card.memeType);
    const rarity = RARITIES[card.rarity];

    // Win chance based on rarity
    const winChance = 0.4 + (rarity.multiplier - 1) * 0.1;
    const won = Math.random() < winChance;

    if (won) {
        const prize = state.prices[card.memeType].current * rarity.multiplier * 0.3;
        state.balance += prize;
        alert(`🎉 ПОБЕДА! Вы выиграли ${formatPrice(prize)}`);
    } else {
        // Remove card
        const idx = state.collection.findIndex(c => c.id === card.id);
        if (idx !== -1) state.collection.splice(idx, 1);
        alert(`💀 Поражение... Ваш ${meme.emoji} ${rarity.name} сгорел!`);
    }

    selectedBattleCard = null;
    document.getElementById('startBattle').disabled = true;
    updateBalance();
    renderCollection();
});

// ============================================
// Navigation
// ============================================

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`page-${pageId}`).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });

    // Resize chart when switching to exchange
    if (pageId === 'exchange' && chart) {
        setTimeout(() => {
            chart.applyOptions({ width: document.getElementById('chartContainer').clientWidth });
        }, 100);
    }
}

// ============================================
// Utility Functions
// ============================================

function formatPrice(price) {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTime(date) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function updateBalance() {
    document.getElementById('userBalance').textContent = formatPrice(state.balance);
    document.getElementById('profileBalance').textContent = formatPrice(state.balance);
    document.getElementById('profileCards').textContent = state.collection.length;
}
