const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// ==========================================================
// ☁️ CONFIGURACIÓN PARA RENDER (PUERTO Y URL)
// ==========================================================
const PORT = process.env.PORT || 3000;
// Si Render nos da una URL externa, la usamos. Si no, usamos localhost.
const BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

// ==========================================================
// ⚙️ TUS CREDENCIALES
// ==========================================================
const GEMINI_API_KEY = "AIzaSyBLXwpEXewOupKwsQy2y0ThbmZr-z90QQk"; 
const EMAIL_USER = "asanchezri.inf@upsa.es"; 
const EMAIL_PASS = "xcmq alie rynk gwdi"; 
// ==========================================================

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

// ==========================================================
// 👥 BASE DE DATOS PERSONALIZADA (8 CLIENTES)
// ==========================================================
let db = [
    // --- GRUPO 1: CORREO DE ZHENG E IVÁN ---
    { 
        id: 1, nombre: "Javier", edad: 35, email: "jpozogo.inf@upsa.es", 
        segmento: "Riesgo Fuga", motivo: "Baja Actividad", deuda: 0, score: 85, 
        avatar: "https://ui-avatars.com/api/?name=Javier&background=random", estado: "Pendiente" 
    },
    { 
        id: 2, nombre: "Ivan", edad: 28, email: "izhengfu.inf@upsa.es", 
        segmento: "Joven", motivo: "Primer Crédito", deuda: 1500, score: 65, 
        avatar: "https://ui-avatars.com/api/?name=Ivan&background=random", estado: "Pendiente" 
    },
    // --- GRUPO 2: CORREO DE PABLO Y GIL ---
    { 
        id: 3, nombre: "Pablo", edad: 42, email: "pmartingi.inf@upsa.es", 
        segmento: "VIP Gold", motivo: "Inversión Pendiente", deuda: 0, score: 95, 
        avatar: "https://ui-avatars.com/api/?name=Pablo&background=random", estado: "Pendiente" 
    },
    { 
        id: 4, nombre: "Alfredo", edad: 50, email: "asanchezri.inf@upsa.es", 
        segmento: "Riesgo Alto", motivo: "Impago > 30 días", deuda: 5200, score: 40, 
        avatar: "https://ui-avatars.com/api/?name=Alfredo&background=random", estado: "Pendiente" 
    },
    // --- GRUPO 3: CORREO DE POZO (Mismo que Javier) ---
    { 
        id: 5, nombre: "Gil", edad: 30, email: "pmartingi.inf@upsa.es", 
        segmento: "Fraude", motivo: "Movimientos sospechosos", deuda: 200, score: 15, 
        avatar: "https://ui-avatars.com/api/?name=Gil&background=random", estado: "Pendiente" 
    },
    { 
        id: 6, nombre: "Pozo", edad: 45, email: "jpozogo.inf@upsa.es", 
        segmento: "Business", motivo: "Línea de Crédito", deuda: 25000, score: 78, 
        avatar: "https://ui-avatars.com/api/?name=Pozo&background=random", estado: "Pendiente" 
    },
    // --- GRUPO 4: CORREO DE SÁNCHEZ-FUENTES (Mismo que Alfredo) ---
    { 
        id: 7, nombre: "Zheng", edad: 24, email: "izhengfu.inf@upsa.es", 
        segmento: "Hipoteca", motivo: "Estudio Viabilidad", deuda: 0, score: 88, 
        avatar: "https://ui-avatars.com/api/?name=Zheng&background=random", estado: "Pendiente" 
    },
    { 
        id: 8, nombre: "Sánchez-Fuentes", edad: 60, email: "asanchezri.inf@upsa.es", 
        segmento: "Riesgo Medio", motivo: "Revolving al límite", deuda: 4900, score: 50, 
        avatar: "https://ui-avatars.com/api/?name=Sanchez&background=random", estado: "Pendiente" 
    }
];

// API: LISTAR CLIENTES
app.get('/api/clientes', (req, res) => res.json(db));

// API: UN CLIENTE
app.get('/api/cliente/:id', (req, res) => {
    const c = db.find(x => x.id == req.params.id);
    c ? res.json(c) : res.status(404).send("404");
});

// API: ANALIZAR CON IA
app.post('/api/analizar', async (req, res) => {
    const { id } = req.body;
    const c = db.find(x => x.id === id);
    console.log(`🧠 Aura analizando a: ${c.nombre} (${c.email})...`);

    try {
        // IMPORTANTE: Aquí inyectamos BASE_URL para que el enlace funcione en Render
        const prompt = `Eres Aura, IA de WiZink. Cliente: ${c.nombre}, Segmento: ${c.segmento}, Motivo: ${c.motivo}.
        Genera un JSON estricto:
        {
            "videoScript": "Hola ${c.nombre}. Soy Aura. He revisado tu caso de ${c.motivo} y tengo una solución.",
            "plan": { "titulo": "Solución ${c.segmento}", "accion1": "Beneficio A", "accion2": "Beneficio B" },
            "emailHTML": "HTML limpio con enlace a: ${BASE_URL}/cliente.html?id=${c.id}",
            "impacto": "+20 puntos"
        }`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
        res.json({ success: true, data: json });

    } catch (e) {
        // Respaldo con BASE_URL dinámica también
        res.json({ success: true, data: {
            videoScript: `Hola ${c.nombre}. Tengo una propuesta para ti.`,
            plan: { titulo: "Plan Personalizado", accion1: "Mejorar condiciones", accion2: "Asesor asignado" },
            emailHTML: `<p>Hola ${c.nombre}.</p><a href='${BASE_URL}/cliente.html?id=${c.id}'>VER PLAN</a>`,
            impacto: "+15 puntos"
        }});
    }
});

// API: ENVIAR MAIL (AL CORREO REAL DE CADA UNO)
app.post('/api/enviar', async (req, res) => {
    const { id, subject, body } = req.body;
    const c = db.find(x => x.id === id);
    
    if(c) {
        c.estado = "✉️ Enviado";
        console.log(`📧 Enviando a ${c.nombre} -> ${c.email}`);
        
        try {
            await transporter.sendMail({ from: `"WiZink Aura" <${EMAIL_USER}>`, to: c.email, subject, html: body });
            res.json({ success: true });
        } catch (e) {
            console.error("Error SMTP:", e);
            res.json({ success: true, simulated: true });
        }
    } else {
        res.status(404).json({ error: "Cliente no encontrado" });
    }
});

// API: ACEPTAR
app.post('/api/aceptar', (req, res) => {
    const { id } = req.body;
    const c = db.find(x => x.id == id);
    if(c) {
        c.estado = "✅ CERRADO";
        console.log(`🎉 ${c.nombre} ha aceptado la oferta!`);
        res.json({ success: true });
    } else res.status(404).send();
});

// ==========================================================
// 🚀 ARRANQUE DEL SERVIDOR
// ==========================================================
app.listen(PORT, () => console.log(`🚀 SERVIDOR LISTO EN: ${BASE_URL}`));
