// server.js

const express = require('express');
const { 
  useMultiFileAuthState, 
  DisconnectReason, 
  Browsers, 
  makeWASocket 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// --- BOT CONFIGURATION AND LOGIC ---
const SESSION_PATH = 'baileys_auth_info';
let sock = null;

const MENU_TEXT = `
⤪ ⤬⤬⤬⤬⤬⤬⤬⤬⤬⤬⤬⤬⤬⤮  
⤬ *Sagittarius Terminator* ⤬  
⤪ ⤬⤬⤬⤬⤬⤬⤬⤬⤬⤬⤬⤬⤬⤮  

╭━━〔 *GROUP MENU* 〕━━┈⊷  
├─╮  
│   ╰┬〔 *⚙️ ADMIN CONTROL* 〕  
│      ├➤ *add* – Add members  
│      ├➤ *kick* – Remove a user  
│      ├➤ *kickall* – Mass remove  
│      ├➤ *promote* – Grant admin  
│      ├➤ *demote* – Revoke admin  
│      ├➤ *listonline* – Active users  
│      ├➤ *totalmembers* – Group count  
│      ╰〔 *...* 〕  
│  
│   ╰┬〔 *🛡️ ANTI-ABUSE* 〕  
│      ├➤ *antilink* – Block URLs  
│      ├➤ *antibot* – Stop bots  
│      ├➤ *antitag* – Prevent spam  
│      ├➤ *antiforeign* – Block non-local  
│      ├➤ *antibadword* – Filter slurs  
│      ╰〔 *...* 〕  
│  
│   ╰┬〔 *🔗 GROUP UTILS* 〕  
│      ├➤ *link* – Get invite  
│      ├➤ *setdesc* – Change bio  
│      ├➤ *setppgroup* – Set icon  
│      ├➤ *tagall* – Mention everyone  
│      ├➤ *poll* – Create a vote  
│      ├➤ *welcome* – Toggle greetings  
│      ╰〔 *EXIT* 〕  
╰────────────────╯  
➢ *Type* \`*menu g\` *for details*
`;

const startBot = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop'),
        logger: pino({ level: 'silent' }),
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Umeunganishwa na WhatsApp!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        const from = m.key.remoteJid;
        const text = m.message.conversation || m.message.extendedTextMessage?.text || '';

        // Amri ya kuonyesha menu
        if (text.startsWith('*menu')) {
            await sock.sendMessage(from, { text: MENU_TEXT });
        }
        
        // Mantiki ya amri nyingine utaongeza hapa
        // Mfano: if (text.startsWith('*kick')) { ... }
    });
};

// --- PAIRING SITE LOGIC ---
let pairingCode = '';
let connectionStatus = 'Disconnected';

app.get('/api/pairing-info', async (req, res) => {
    if (!sock || !sock.authState.creds.registered) {
        if (!sock) {
            await startBot();
        } else if (!pairingCode) {
            const phoneNumber = '255xxxxxxxxx';
            pairingCode = await sock.requestPairingCode(phoneNumber);
        }
        res.json({
            code: pairingCode,
            status: 'Waiting for Pairing Code',
        });
    } else {
        res.json({
            code: '',
            status: 'Connected',
        });
    }
});

// Kutumikia faili za static (frontend)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`Server inaendesha kwenye http://localhost:${PORT}`);
    startBot();
});
