class PixAssistindoManager {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.stats = {
            requests: 0,
            successes: 0,
            errors: 0,
            totalEarnings: 0
        };
        this.autoScroll = true;
        this.currentUserData = null;
        this.rewardsConfig = null;
        
        // Sistema de bloqueio de múltiplas sessões
        this.sessionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        this.sessionChannel = new BroadcastChannel('pix_assistindo_session');
        this.isSessionActive = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.loadURLParameters();
        this.updateUI();
        this.loadRewardsConfig();
        this.startResetCheckTimer();
    }

    initializeElements() {
        // Form elements
        this.emailInput = document.getElementById('email');
        this.tipoAnuncioSelect = document.getElementById('tipoAnuncio');
        this.intervalSlider = document.getElementById('interval');
        this.intervalValue = document.getElementById('intervalValue');
        
        // Control buttons
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.manualBtn = document.getElementById('manualBtn');
        if (this.manualBtn) this.manualBtn.disabled = true;
        this.autoScrollBtn = document.getElementById('autoScrollBtn');
        
        // Status elements
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        
        // Stats elements
        this.requestCount = document.getElementById('requestCount');
        this.successCount = document.getElementById('successCount');
        this.errorCount = document.getElementById('errorCount');
        this.totalEarnings = document.getElementById('totalEarnings');
        
        // Containers
        this.userInfoContainer = document.getElementById('userInfoContainer');
        this.missionContainer = document.getElementById('missionContainer');
        this.rewardsContainer = document.getElementById('rewardsContainer');
        this.logContainer = document.getElementById('logContainer');
    }

    bindEvents() {
        // Slider value update
        this.intervalSlider.addEventListener('input', (e) => {
            this.intervalValue.textContent = e.target.value;
            this.saveSettings();
        });

        // Control buttons
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.clearBtn.addEventListener('click', () => this.clearLog());
        this.manualBtn.addEventListener('click', () => this.watchAdManual());
        this.autoScrollBtn.addEventListener('click', () => this.toggleAutoScroll());

        // Save settings on input change
        this.emailInput.addEventListener('input', () => this.saveSettings());
        this.tipoAnuncioSelect.addEventListener('change', () => this.saveSettings());

        // Prevent form submission on Enter
        this.emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!this.isRunning && this.validateInputs()) {
                    this.start();
                }
            }
        });
    }

    saveSettings() {
        const settings = {
            email: this.emailInput.value,
            tipoAnuncio: this.tipoAnuncioSelect.value,
            interval: this.intervalSlider.value
        };
        localStorage.setItem('pixAssistindoSettings', JSON.stringify(settings));
    }

    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('pixAssistindoSettings') || '{}');
            if (settings.email) this.emailInput.value = settings.email;
            if (settings.tipoAnuncio) this.tipoAnuncioSelect.value = settings.tipoAnuncio;
            if (settings.interval) {
                this.intervalSlider.value = settings.interval;
                this.intervalValue.textContent = settings.interval;
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    loadURLParameters() {
        try {
            const params = new URLSearchParams(window.location.search);
            const email = params.get('email');
            const userId = params.get('userId');
            
            if (email) {
                this.emailInput.value = decodeURIComponent(email);
                localStorage.setItem('user_email', email);
                console.log('[URL PARAMS] Email carregado da URL:', email);
            }
            
            if (userId) {
                localStorage.setItem('user_id', userId);
                console.log('[URL PARAMS] UserId carregado da URL:', userId);
            }
        } catch (error) {
            console.error('Erro ao carregar parametros de URL:', error);
        }
    }

    validateInputs() {
        const email = this.emailInput.value.trim();

        if (!email) {
            this.addLog('error', 'E-mail é obrigatório');
            this.emailInput.focus();
            return false;
        }

        // Validação básica de e-mail
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.addLog('error', 'Formato de e-mail inválido');
            this.emailInput.focus();
            return false;
        }

        return true;
    }

    async loadRewardsConfig() {
        try {
            this.addLog('info', '⚙️ Carregando configurações de recompensa...');
            const config = await this.getConfigMissao();
            
            if (config) {
                this.rewardsConfig = config;
                this.updateRewardsDisplay(config);
                this.addLog('success', '✅ Configurações de recompensa carregadas');
            } else {
                this.addLog('warning', '⚠️ Não foi possível carregar configurações de recompensa');
            }
        } catch (error) {
            this.addLog('error', `❌ Erro ao carregar configurações: ${error.message}`);
        }
    }


    // Sistema de bloqueio de múltiplas sessões
    initSessionControl() {
        // Verificar se já existe uma sessão ativa
        const activeSession = localStorage.getItem('active_bot_session');
        const activeSessionTime = localStorage.getItem('active_bot_session_time');
        
        if (activeSession && activeSessionTime) {
            const timeDiff = Date.now() - parseInt(activeSessionTime);
            // Se a sessão tem menos de 5 segundos, considerar ativa
            if (timeDiff < 5000) {
                this.addLog('error', '❌ Bot já está rodando em outra aba/navegador!');
                this.addLog('warning', '⚠️ Feche a outra sessão antes de iniciar aqui.');
                return false;
            }
        }
        
        // Registrar esta sessão como ativa
        localStorage.setItem('active_bot_session', this.sessionId);
        localStorage.setItem('active_bot_session_time', Date.now().toString());
        this.isSessionActive = true;
        
        // Atualizar timestamp a cada 2 segundos
        this.sessionHeartbeat = setInterval(() => {
            if (this.isRunning) {
                localStorage.setItem('active_bot_session_time', Date.now().toString());
            }
        }, 2000);
        
        // Escutar mensagens de outras abas
        this.sessionChannel.onmessage = (event) => {
            if (event.data.type === 'session_check' && event.data.sessionId !== this.sessionId) {
                if (this.isRunning) {
                    // Informar que esta sessão está ativa
                    this.sessionChannel.postMessage({
                        type: 'session_active',
                        sessionId: this.sessionId
                    });
                }
            }
            
            if (event.data.type === 'session_active' && event.data.sessionId !== this.sessionId) {
                if (this.isRunning) {
                    // Outra sessão está ativa, parar esta
                    this.addLog('error', '❌ Detectada sessão ativa em outra aba!');
                    this.stop();
                }
            }
        };
        
        return true;
    }
    
    checkForOtherSessions() {
        // Enviar mensagem para verificar outras sessões
        this.sessionChannel.postMessage({
            type: 'session_check',
            sessionId: this.sessionId
        });
        
        // Aguardar resposta por 500ms
        return new Promise((resolve) => {
            let hasOtherSession = false;
            
            const listener = (event) => {
                if (event.data.type === 'session_active' && event.data.sessionId !== this.sessionId) {
                    hasOtherSession = true;
                }
            };
            
            this.sessionChannel.addEventListener('message', listener);
            
            setTimeout(() => {
                this.sessionChannel.removeEventListener('message', listener);
                resolve(hasOtherSession);
            }, 500);
        });
    }
    
    clearSession() {
        if (this.isSessionActive) {
            const activeSession = localStorage.getItem('active_bot_session');
            if (activeSession === this.sessionId) {
                localStorage.removeItem('active_bot_session');
                localStorage.removeItem('active_bot_session_time');
            }
            this.isSessionActive = false;
        }
        
        if (this.sessionHeartbeat) {
            clearInterval(this.sessionHeartbeat);
            this.sessionHeartbeat = null;
        }
    }

    async start() {
        if (!this.validateInputs()) {
            return;
        }
        
        // Verificar se já existe outra sessão ativa
        const hasOtherSession = await this.checkForOtherSessions();
        if (hasOtherSession) {
            this.addLog('error', '❌ Bot já está rodando em outra aba/navegador!');
            this.addLog('warning', '⚠️ Feche a outra sessão antes de iniciar aqui.');
            return;
        }
        
        // Inicializar controle de sessão
        if (!this.initSessionControl()) {
            return;
        }

        this.isRunning = true;
        this.updateUI();
        
        const email = this.emailInput.value.trim();
        const tipoAnuncio = this.tipoAnuncioSelect.value;
        
        this.addLog('info', `🚀 Iniciando simulação de anúncios para: ${email}`);
        this.addLog('info', `📺 Tipo de anúncio: ${tipoAnuncio === 'rewarded' ? 'Recompensado' : 'Intersticial'}`);
        this.addLog('info', `⏱️ Intervalo: ${this.intervalSlider.value} segundos`);

        // Primeira execução imediata
        await this.watchAd();

        // Configurar execução periódica
        const intervalMs = parseInt(this.intervalSlider.value) * 1000;
        this.intervalId = setInterval(() => {
            this.watchAd();
        }, intervalMs);
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.updateUI();
        this.addLog('info', '⏹️ Simulação parada pelo usuário');
    }

    async watchAdManual() {
        if (this.isRunning) {
            this.addLog('warning', '⚠️ Pare a simulação automática antes de usar o modo manual');
            return;
        }

        if (!this.validateInputs()) {
            return;
        }

        await this.watchAd();
    }

    async watchAd() {
        if (!this.isRunning && !this.validateInputs()) return;

        const email = this.emailInput.value.trim();
        const tipoAnuncio = this.tipoAnuncioSelect.value;
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        
        this.stats.requests++;
        this.updateStats();

        try {
            this.addLog('info', `🔍 ${timestamp} - Buscando dados do usuário...`);
            
            // 1. Buscar usuário atual
            const userData = await this.buscarUsuario(email);
            
            if (!userData || userData.count === 0) {
                throw new Error('Usuário não encontrado');
            }

            const usuario = userData.results[0];
            const saldoAtual = parseFloat(usuario.saldo);
            
            this.addLog('success', `💰 ${timestamp} - Saldo atual: R$ ${saldoAtual.toFixed(5)}`);
            this.updateUserInfo(usuario);

            // 2. Calcular recompensa
            const recompensa = this.calculateReward(tipoAnuncio);
            const novoSaldo = saldoAtual + recompensa;

            this.addLog('info', `🎯 ${timestamp} - Assistindo anúncio ${tipoAnuncio === 'rewarded' ? 'recompensado' : 'intersticial'}...`);
            this.addLog('money', `💵 ${timestamp} - Recompensa: R$ ${recompensa.toFixed(5)}`);

            // 3. Atualizar saldo do usuário
            const updateResult = await this.atualizarUsuario(usuario.id, novoSaldo.toFixed(5), 1);
            
            if (updateResult && updateResult.sucesso) {
                this.addLog('success', `✅ ${timestamp} - Saldo atualizado: R$ ${novoSaldo.toFixed(5)}`);
            } else {
                throw new Error('Falha ao atualizar saldo do usuário');
            }

            // 4. Atualizar missão
            const missionResult = await this.atualizarMissao(email, recompensa.toFixed(5));
            
            if (missionResult && missionResult.sucesso) {
                this.addLog('success', `🎯 ${timestamp} - Missão atualizada`);
                
                // Atualizar display da missão
                if (missionResult.progresso && missionResult.meta) {
                    this.updateMissionDisplay({
                        progresso: missionResult.progresso,
                        meta: missionResult.meta,
                        ultima_missao: missionResult.ultima_missao || new Date().toISOString().split('T')[0]
                    });
                }
            } else {
                this.addLog('warning', `⚠️ ${timestamp} - Falha ao atualizar missão`);
            }

            // 5. Buscar dados atualizados
            const updatedUserData = await this.buscarUsuario(email);
            if (updatedUserData && updatedUserData.count > 0) {
                this.updateUserInfo(updatedUserData.results[0]);
            }

            this.stats.successes++;
            this.stats.totalEarnings += recompensa;
            
        } catch (error) {
            this.handleError(error, timestamp);
        }
        
        this.updateStats();
    }

    calculateReward(tipoAnuncio) {
        if (!this.rewardsConfig) {
            // Valores padrão se não conseguir carregar configurações
            return tipoAnuncio === 'rewarded' ? 
                0.001 + (Math.random() * 0.004) : // 0.001 a 0.005
                0.002; // valor fixo para intersticial
        }

        switch (tipoAnuncio) {
            case 'rewarded':
                const min = parseFloat(this.rewardsConfig.rewarded_min || 0.001);
                const max = parseFloat(this.rewardsConfig.rewarded_max || 0.005);
                return min + (Math.random() * (max - min));
            case 'interstitial':
                return parseFloat(this.rewardsConfig.interstitial_reward || 0.002);
            default:
                return 0.001;
        }
    }

    async buscarUsuario(email) {
        try {
            const response = await fetch('/api/buscar_usuario', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Host': 'pixassistindo.thm.app.br',
                    'User-Agent': 'okhttp/4.11.0'
                },
                body: JSON.stringify({ email: email })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Erro ao buscar usuário: ${error.message}`);
        }
    }

    async atualizarUsuario(id, saldo, views) {
        try {
            const response = await fetch('/api/atualizar_usuario', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Host': 'pixassistindo.thm.app.br',
                    'User-Agent': 'okhttp/4.11.0'
                },
                body: JSON.stringify({
                    id: id.toString(),
                    saldo: saldo,
                    views: views
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Erro ao atualizar usuário: ${error.message}`);
        }
    }

    async atualizarMissao(email, valorPago) {
        try {
            const response = await fetch('/api/atualizar_missao', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Host': 'pixassistindo.thm.app.br',
                    'User-Agent': 'okhttp/4.11.0'
                },
                body: JSON.stringify({
                    email: email,
                    valor_pago: valorPago
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Erro ao atualizar missão: ${error.message}`);
        }
    }

    async getConfigMissao() {
        try {
            const response = await fetch('/api/get_config_missao', {
                method: 'GET',
                headers: {
                    'Host': 'pixassistindo.thm.app.br',
                    'User-Agent': 'okhttp/4.11.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Erro ao obter configurações: ${error.message}`);
        }
    }

    handleError(error, timestamp) {
        this.stats.errors++;
        
        let errorMessage = error.message;
        
        // Tratar erros específicos
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet.';
        } else if (error.message.includes('CORS')) {
            errorMessage = 'Erro de CORS. O servidor pode não permitir requisições do navegador.';
        }
        
        this.addLog('error', `❌ ${timestamp} - ${errorMessage}`);
        
        // Se muitos erros consecutivos, sugerir parar
        if (this.stats.errors > 3 && this.stats.successes === 0) {
            this.addLog('warning', '⚠️ Muitos erros detectados. Verifique as configurações ou pare o processo.');
        }
    }

    updateUserInfo(userData) {
        if (!userData) return;

        this.currentUserData = userData;
        
        const userInfoHtml = `
            <div class="user-info-grid">
                <div class="user-info-item">
                    <div class="user-info-label">ID</div>
                    <div class="user-info-value">${userData.id || 'N/A'}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">E-mail</div>
                    <div class="user-info-value">${userData.email || 'N/A'}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Saldo</div>
                    <div class="user-info-value">R$ ${parseFloat(userData.saldo || 0).toFixed(5)}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Device ID</div>
                    <div class="user-info-value">${userData.device_id || 'N/A'}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Última Recompensa</div>
                    <div class="user-info-value">${userData.ultima_recompensa || 'Nunca'}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Status</div>
                    <div class="user-info-value">${userData.banido ? 'Banido' : 'Ativo'}</div>
                </div>
            </div>
        `;
        
        this.userInfoContainer.innerHTML = userInfoHtml;

        // Atualizar missão se disponível
        if (userData.progresso_missao2 !== undefined) {
            this.updateMissionDisplay({
                progresso: userData.progresso_missao2,
                meta: userData.meta_missao2
            });
        }
    }

    updateMissionDisplay(missionData) {
        const progresso = parseFloat(missionData.progresso || 0);
        const meta = parseFloat(missionData.meta || 0.5);
        const percentage = meta > 0 ? (progresso / meta) * 100 : 0;

        const missionHtml = `
            <div class="mission-grid">
                <div class="mission-item">
                    <div class="mission-label">Progresso Atual</div>
                    <div class="mission-value">R$ ${progresso.toFixed(5)}</div>
                </div>
                <div class="mission-item">
                    <div class="mission-label">Meta da Missão</div>
                    <div class="mission-value">R$ ${meta.toFixed(5)}</div>
                </div>
                <div class="mission-item">
                    <div class="mission-label">Percentual</div>
                    <div class="mission-value">${percentage.toFixed(1)}%</div>
                </div>
                <div class="mission-item">
                    <div class="mission-label">Última Atualização</div>
                    <div class="mission-value">${missionData.ultima_missao || 'Hoje'}</div>
                </div>
            </div>
            <div class="mission-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <div class="progress-text">
                    Faltam R$ ${Math.max(0, meta - progresso).toFixed(5)} para completar a missão
                </div>
            </div>
        `;
        
        this.missionContainer.innerHTML = missionHtml;
    }

    updateRewardsDisplay(rewardsData) {
        const rewardsHtml = `
            <div class="rewards-grid">
                <div class="rewards-item">
                    <div class="rewards-label">Recompensa Mínima (Rewarded)</div>
                    <div class="rewards-value">R$ ${parseFloat(rewardsData.rewarded_min || 0).toFixed(5)}</div>
                </div>
                <div class="rewards-item">
                    <div class="rewards-label">Recompensa Máxima (Rewarded)</div>
                    <div class="rewards-value">R$ ${parseFloat(rewardsData.rewarded_max || 0).toFixed(5)}</div>
                </div>
                <div class="rewards-item">
                    <div class="rewards-label">Recompensa Intersticial</div>
                    <div class="rewards-value">R$ ${parseFloat(rewardsData.interstitial_reward || 0).toFixed(5)}</div>
                </div>
                <div class="rewards-item">
                    <div class="rewards-label">Recompensa Login</div>
                    <div class="rewards-value">R$ ${parseFloat(rewardsData.recompensa_login || 0).toFixed(5)}</div>
                </div>
                <div class="rewards-item">
                    <div class="rewards-label">Nome da Missão</div>
                    <div class="rewards-value">${rewardsData.nome_missao || 'Missão Padrão'}</div>
                </div>
            </div>
        `;
        
        this.rewardsContainer.innerHTML = rewardsHtml;
    }

    addLog(type, message) {
        // Remover mensagem de log vazio se existir
        const emptyLog = this.logContainer.querySelector('.log-empty');
        if (emptyLog) {
            emptyLog.remove();
        }

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = message;

        this.logContainer.appendChild(logEntry);

        // Limitar número de logs (manter últimos 100)
        const logs = this.logContainer.querySelectorAll('.log-entry');
        if (logs.length > 100) {
            logs[0].remove();
        }

        // Auto scroll se habilitado
        if (this.autoScroll) {
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }
    }

    clearLog() {
        this.logContainer.innerHTML = `
            <div class="log-empty">
                <span class="log-empty-icon">📝</span>
                <p>Log limpo. Clique em "Iniciar Simulação" para começar novamente.</p>
            </div>
        `;
        
        // Reset stats
        this.stats = {
            requests: 0,
            successes: 0,
            errors: 0,
            totalEarnings: this.stats.totalEarnings // Manter ganhos totais
        };
        this.updateStats();
    }

    toggleAutoScroll() {
        this.autoScroll = !this.autoScroll;
        this.autoScrollBtn.classList.toggle('active', this.autoScroll);
        this.autoScrollBtn.textContent = this.autoScroll ? 'Auto Scroll' : 'Manual Scroll';
    }

    updateUI() {
        // Atualizar botões
        this.startBtn.disabled = this.isRunning;
        this.stopBtn.disabled = !this.isRunning;
        // this.manualBtn.disabled = this.isRunning; // Mantido desabilitado
        
        // Atualizar inputs
        this.emailInput.disabled = this.isRunning;
        this.tipoAnuncioSelect.disabled = this.isRunning;
        this.intervalSlider.disabled = this.isRunning;
        
        // Atualizar status
        if (this.isRunning) {
            this.statusDot.className = 'status-dot running';
            this.statusText.textContent = 'Executando';
        } else {
            this.statusDot.className = 'status-dot stopped';
            this.statusText.textContent = 'Parado';
        }
    }

    updateStats() {
        this.requestCount.textContent = this.stats.requests;
        this.successCount.textContent = this.stats.successes;
        this.errorCount.textContent = this.stats.errors;
        this.totalEarnings.textContent = `R$ ${this.stats.totalEarnings.toFixed(5)}`;
    }
    // Verificação de reset a cada 1 minuto
    startResetCheckTimer() {
        setInterval(async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const userId = urlParams.get('userId') || localStorage.getItem('user_id');
                
                if (!userId) return;
                
                const response = await fetch(`/api/stats/user/${userId}`);
                if (!response.ok) return;
                
                const data = await response.json();
                const impressions = data.total_impressions || 0;
                const clicks = data.total_clicks || 0;
                const sessionExpired = data.session_expired || false;
                
                // Se resetou (ambos voltaram a 0) OU sessão expirou
                if ((impressions === 0 && clicks === 0) || sessionExpired) {
                    console.log('[RESET] Dados resetados ou sessão expirou! Redirecionando...');
                    if (this.isRunning) {
                        this.stop();
                    }
                    localStorage.removeItem('user_logged_in');
                    localStorage.removeItem('user_id');
                    localStorage.removeItem('user_email');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                }
            } catch (error) {
                console.error('[RESET] Erro ao verificar reset:', error);
            }
        }, 60000); // 60000ms = 1 minuto
        
        console.log('[RESET] Timer de verificação iniciado (verifica a cada 1 minuto)');
    }

}

// Inicializar aplicação quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new PixAssistindoManager();
});

// Service Worker para PWA (opcional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registrado com sucesso:', registration);
            })
            .catch(registrationError => {
                console.log('Falha no registro do SW:', registrationError);
            });
    });
}

