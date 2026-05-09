const db = require("../config/db");
const nodemailer = require("nodemailer");

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
};

const sendReminder = async (event, user) => {
  const transporter = createTransporter();
  if (!transporter) return;
  
  const eventDate = new Date(event.start_date).toLocaleString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  
  await transporter.sendMail({
    from: `"Maison du Web" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `⏰ Rappel: ${event.title} demain`,
    html: `
      <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1>⏰ Rappel d'événement</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Bonjour ${user.nom_complet},</h2>
          <p>Rappel: <strong>${event.title}</strong> aura lieu demain:</p>
          <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p>📅 Date: ${eventDate}</p>
            ${event.description ? `<p>📝 ${event.description}</p>` : ''}
          </div>
          <a href="http://localhost:5173/calendar" style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir le calendrier</a>
        </div>
      </div>
    `
  });
  console.log(`✅ Rappel envoyé à ${user.email}`);
};

const checkReminders = async () => {
  try {
    // Événements dans les prochaines 24h
    const [events] = await db.query(`
      SELECT e.*, ep.user_id, u.email, u.nom_complet
      FROM events e
      JOIN event_participants ep ON e.id = ep.event_id
      JOIN users u ON ep.user_id = u.id
      WHERE e.deleted_at IS NULL
      AND e.start_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
      AND ep.reminder_sent = 0
    `);
    
    for (const event of events) {
      await sendReminder(event, event);
      await db.query(`UPDATE event_participants SET reminder_sent = 1 WHERE event_id = ? AND user_id = ?`, 
        [event.id, event.user_id]);
    }
  } catch (error) {
    console.error("Erreur checkReminders:", error);
  }
};

const startReminderService = () => {
  console.log("⏰ Service de rappel démarré (vérification toutes les heures)");
  setInterval(checkReminders, 60 * 60 * 1000);
  checkReminders();
};

module.exports = { startReminderService };