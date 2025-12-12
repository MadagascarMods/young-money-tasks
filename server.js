const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Função para fazer proxy de requisições
function proxyRequest(method, url, headers, body) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https');
        const client = isHttps ? https : http;
        
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                ...headers,
                'Host': urlObj.hostname
            }
        };
        
        // Remover headers que podem causar problemas
        delete options.headers['host'];
        delete options.headers['connection'];
        
        const req = client.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (body) {
            req.write(JSON.stringify(body));
        }
        
        req.end();
    });
}

// Proxy para /api/buscar_usuario
app.post('/api/buscar_usuario', async (req, res) => {
    try {
        const result = await proxyRequest(
            'POST',
            'https://pixassistindo.thm.app.br/backend/buscar_usuario.php',
            {
                'Content-Type': 'application/json',
                'User-Agent': 'okhttp/4.11.0'
            },
            req.body
        );
        
        res.status(result.status)
            .set('Access-Control-Allow-Origin', '*')
            .set('Content-Type', 'application/json')
            .send(result.body);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

// Proxy para /api/atualizar_usuario
app.post('/api/atualizar_usuario', async (req, res) => {
    try {
        const result = await proxyRequest(
            'POST',
            'https://pixassistindo.thm.app.br/backend/atualizar_usuario.php',
            {
                'Content-Type': 'application/json',
                'User-Agent': 'okhttp/4.11.0'
            },
            req.body
        );
        
        res.status(result.status)
            .set('Access-Control-Allow-Origin', '*')
            .set('Content-Type', 'application/json')
            .send(result.body);
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

// Proxy para /api/atualizar_missao
app.post('/api/atualizar_missao', async (req, res) => {
    try {
        const result = await proxyRequest(
            'POST',
            'https://pixassistindo.thm.app.br/backend/atualizar_missao.php',
            {
                'Content-Type': 'application/json',
                'User-Agent': 'okhttp/4.11.0'
            },
            req.body
        );
        
        res.status(result.status)
            .set('Access-Control-Allow-Origin', '*')
            .set('Content-Type', 'application/json')
            .send(result.body);
    } catch (error) {
        console.error('Erro ao atualizar missão:', error);
        res.status(500).json({ error: 'Erro ao atualizar missão' });
    }
});

// Proxy para /api/get_config_missao
app.get('/api/get_config_missao', async (req, res) => {
    try {
        const result = await proxyRequest(
            'GET',
            'https://pixassistindo.thm.app.br/backend/get_config_missao.php',
            {
                'User-Agent': 'okhttp/4.11.0'
            }
        );
        
        res.status(result.status)
            .set('Access-Control-Allow-Origin', '*')
            .set('Content-Type', 'application/json')
            .send(result.body);
    } catch (error) {
        console.error('Erro ao obter configurações:', error);
        res.status(500).json({ error: 'Erro ao obter configurações' });
    }
});

// Proxy para /api/configuracoes
app.get('/api/configuracoes', async (req, res) => {
    try {
        const result = await proxyRequest(
            'GET',
            'https://pixassistindo.thm.app.br/backend/configuracoes.php',
            {
                'User-Agent': 'okhttp/4.11.0'
            }
        );
        
        res.status(result.status)
            .set('Access-Control-Allow-Origin', '*')
            .set('Content-Type', 'application/json')
            .send(result.body);
    } catch (error) {
        console.error('Erro ao obter configurações:', error);
        res.status(500).json({ error: 'Erro ao obter configurações' });
    }
});

// Proxy para /api/get_cpm
app.get('/api/get_cpm', async (req, res) => {
    try {
        const result = await proxyRequest(
            'GET',
            'https://pixassistindo.thm.app.br/backend/get_cpm.php',
            {
                'User-Agent': 'okhttp/4.11.0'
            }
        );
        
        res.status(result.status)
            .set('Access-Control-Allow-Origin', '*')
            .set('Content-Type', 'application/json')
            .send(result.body);
    } catch (error) {
        console.error('Erro ao obter CPM:', error);
        res.status(500).json({ error: 'Erro ao obter CPM' });
    }
});

// Proxy para /api/stats/user/:userId
app.get('/api/stats/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const result = await proxyRequest(
            'GET',
            `https://monetag-postback-server-production.up.railway.app/api/stats/user/${userId}`,
            {
                'User-Agent': 'okhttp/4.11.0'
            }
        );
        
        res.status(result.status)
            .set('Access-Control-Allow-Origin', '*')
            .set('Content-Type', 'application/json')
            .send(result.body);
    } catch (error) {
        console.error('Erro ao obter stats do usuário:', error);
        res.status(500).json({ error: 'Erro ao obter stats do usuário' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
