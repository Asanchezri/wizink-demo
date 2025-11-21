const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const nodemailer = require('nodemailer');
const path = require('path'); // Importante para las rutas

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================================
// 📁 CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS (LA WEB)
// ==========================================================
// Busca los archivos dentro de la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Si entran a la raíz, sirve el index.html explícitamente
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================================
// ☁️ CONFIGURACIÓN RENDER
// ==========================================================
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

// ==========================================================
// ⚙️ CREDENCIALES
// ==========================================================
const GEMINI_API_KEY = "AIzaSyBLXwpEXewOupKwsQy2y0ThbmZr-z90QQk"; 
const EMAIL_USER = "asanchezri.inf@upsa.es"; 
const EMAIL_PASS = "xcmq alie rynk gwdi"; 

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ==========================================================
// 🔧 CONFIGURACIÓN SMTP SEGURA (CORRECCIÓN ETIMEDOUT)
// ==========================================================
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,            // Puerto seguro SSL (evita bloqueos)
    secure: true,         // Obligatorio para el puerto 465
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    connectionTimeout: 5000 // Si en 5s no conecta, salta al error (Vital para la demo)
});

// ==========================================================
// 👥 BASE DE DATOS
// ==========================================================
let db = [
    { id: 1, nombre: "Javier", edad: 35, email: "jpozogo.inf@upsa.es", segmento: "Riesgo Fuga", motivo: "Baja Actividad", deuda: 0, score: 85, avatar: "https://ui-avatars.com/api/?name=Javier&background=random", estado: "Pendiente" },
    { id: 2, nombre: "Ivan", edad: 28, email: "izhengfu.inf@upsa.es", segmento: "Joven", motivo: "Primer Crédito", deuda: 1500, score: 65, avatar: "https://ui-avatars.com/api/?name=Ivan&background=random", estado: "Pendiente" },
    { id: 3, nombre: "Pablo", edad: 42, email: "pmartingi.inf@upsa.es", segmento: "VIP Gold", motivo: "Inversión Pendiente", deuda: 0, score: 95, avatar: "https://ui-avatars.com/api/?name=Pablo&background=random", estado: "Pendiente" },
    { id: 4, nombre: "Alfredo", edad: 50, email: "asanchezri.inf@upsa.es", segmento: "Riesgo Alto", motivo: "Impago > 30 días", deuda: 5200, score: 40, avatar: "https://ui-avatars.com/api/?name=Alfredo&background=random", estado: "Pendiente" },
    { id: 5, nombre: "Gil", edad: 30, email: "pmartingi.inf@upsa.es", segmento: "Fraude", motivo: "Movimientos sospechosos", deuda: 200, score: 15, avatar: "https://ui-avatars.com/api/?name=Gil&background=random", estado: "Pendiente" },
    { id: 6, nombre: "Pozo", edad: 45, email: "jpozogo.inf@upsa.es", segmento: "Business", motivo: "Línea de Crédito", deuda: 25000, score: 78, avatar: "https://ui-avatars.com/api/?name=Pozo&background=random", estado: "Pendiente" },
    { id: 7, nombre: "Zheng", edad: 24, email: "izhengfu.inf@upsa.es", segmento: "Hipoteca", motivo: "Estudio Viabilidad", deuda: 0, score: 88, avatar: "https://ui-avatars.com/api/?name=Zheng&background=random", estado: "Pendiente" },
    { id: 8, nombre: "Sánchez-Fuentes", edad: 60, email: "asanchezri.inf@upsa.es", segmento: "Riesgo Medio", motivo: "Revolving al límite", deuda: 4900, score: 50, avatar: "https://ui-avatars.com/api/?name=Sanchez&background=random", estado: "Pendiente" }
];

// API: Listar
app.get('/api/clientes', (req, res) => res.json(db));

// API: Un cliente
app.get('/api/cliente/:id', (req, res) => {
    const c = db.find(x => x.id == req.params.id);
    c ? res.json(c) : res.status(404).send("404");
});

// API: Analizar (IA)
app.post('/api/analizar', async (req, res) => {
    const { id } = req.body;
    const c = db.find(x => x.id === id);
    console.log(`🧠 Aura analizando a: ${c.nombre}...`);

    try {
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
        // Fallback robusto
        res.json({ success: true, data: {
            videoScript: `Hola ${c.nombre}. Tengo una propuesta para ti.`,
            plan: { titulo: "Plan Personalizado", accion1: "Mejorar condiciones", accion2: "Asesor asignado" },
            emailHTML: `<p>Hola ${c.nombre}.</p><a href='${BASE_URL}/cliente.html?id=${c.id}'>VER PLAN</a>`,
            impacto: "+15 puntos"
        }});
    }
});

// API: Enviar (Con protección anti-timeout)
app.post('/api/enviar', async (req, res) => {
    const { id, subject, body } = req.body;
    const c = db.find(x => x.id === id);
    
    if(c) {
        c.estado = "✉️ Enviado";
        console.log(`📧 Intentando enviar a ${c.nombre}...`);
        
        try {
            await transporter.sendMail({ from: `"WiZink Aura" <${EMAIL_USER}>`, to: c.email, subject, html: body });
            console.log("✅ Correo enviado con éxito (SMTP)");
            res.json({ success: true });
        } catch (e) {
            console.error("⚠️ Error SMTP (Timeout o Bloqueo):", e.message);
            console.log("🔄 Activando SIMULACIÓN para no detener la demo.");
            // Fingimos éxito para que la UI continúe
            res.json({ success: true, simulated: true });
        }
    } else {
        res.status(404).json({ error: "Cliente no encontrado" });
    }
});

// API: Aceptar oferta
app.post('/api/aceptar', (req, res) => {
    const { id } = req.body;
    const c = db.find(x => x.id == id);
    if(c) {
        c.estado = "✅ CERRADO";
        res.json({ success: true });
    } else res.status(404).send();
});

// Arranque
app.listen(PORT, () => console.log(`🚀 SERVIDOR LISTO EN: ${BASE_URL}`));
