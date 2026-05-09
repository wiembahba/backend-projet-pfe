const express        = require("express");
const router         = express.Router();
const db             = require("../config/db");
const nodemailer     = require("nodemailer");
const { verifyToken, isChefProjet } = require("../middleware/authMiddleware");

// ─── Transporter email ───────────────────────────────────────────────────────
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
};

// ─── GET /users ──────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT id, nom_complet, email, role, departement 
      FROM users 
      WHERE deleted_at IS NULL
      ORDER BY nom_complet ASC
    `);
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du chargement des utilisateurs" });
  }
};

// ─── GET /departments ────────────────────────────────────────────────────────
const getDepartments = async (req, res) => {
  try {
    const [departments] = await db.query(`
      SELECT DISTINCT departement as name 
      FROM users 
      WHERE departement IS NOT NULL AND departement != '' AND deleted_at IS NULL
      ORDER BY departement ASC
    `);
    res.json({ success: true, departments });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du chargement des départements" });
  }
};

// ─── GET /events ─────────────────────────────────────────────────────────────
const getEvents = async (req, res) => {
  try {
    const userId   = req.user.id;
    const userRole = req.user.role;
    let sql    = "";
    let params = [];

    if (userRole === "admin") {
      sql = `
        SELECT 
          e.id, e.title, e.description,
          DATE_FORMAT(e.start_date, '%Y-%m-%d %H:%i:%s') as start,
          DATE_FORMAT(e.end_date,   '%Y-%m-%d %H:%i:%s') as end,
          e.visibility, e.color, e.all_day,
          u.nom_complet as created_by_name
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.deleted_at IS NULL
        ORDER BY e.start_date ASC
      `;
    } else if (userRole === "chef_projet") {
      sql = `
        SELECT DISTINCT
          e.id, e.title, e.description,
          DATE_FORMAT(e.start_date, '%Y-%m-%d %H:%i:%s') as start,
          DATE_FORMAT(e.end_date,   '%Y-%m-%d %H:%i:%s') as end,
          e.visibility, e.color, e.all_day,
          u.nom_complet as created_by_name,
          e.start_date as sort_date
        FROM events e
        LEFT JOIN users u  ON e.created_by  = u.id
        LEFT JOIN event_participants ep ON e.id = ep.event_id
        WHERE e.deleted_at IS NULL
          AND (e.visibility = 'public' OR e.created_by = ? OR ep.user_id = ?)
        ORDER BY e.start_date ASC
      `;
      params = [userId, userId];
    } else {
      sql = `
        SELECT DISTINCT
          e.id, e.title, e.description,
          DATE_FORMAT(e.start_date, '%Y-%m-%d %H:%i:%s') as start,
          DATE_FORMAT(e.end_date,   '%Y-%m-%d %H:%i:%s') as end,
          e.visibility, e.color, e.all_day,
          u.nom_complet as created_by_name,
          e.start_date as sort_date
        FROM events e
        LEFT JOIN users u  ON e.created_by  = u.id
        LEFT JOIN event_participants ep ON e.id = ep.event_id
        WHERE e.deleted_at IS NULL
          AND (e.visibility = 'public' OR ep.user_id = ?)
        ORDER BY e.start_date ASC
      `;
      params = [userId];
    }

    const [events] = await db.query(sql, params);

    const formattedEvents = events.map(({ sort_date, ...event }) => ({
      id:              event.id,
      title:           event.title,
      start:           event.start,
      end:             event.end,
      allDay:          event.all_day === 1,
      backgroundColor: event.color || "#5b6cff",
      borderColor:     event.color || "#5b6cff",
      extendedProps: {
        description:      event.description,
        visibility:       event.visibility,
        created_by_name:  event.created_by_name,
      },
    }));

    res.json({ success: true, events: formattedEvents });
  } catch (error) {
    console.error("❌ Erreur getEvents:", error);
    res.status(500).json({ message: "Erreur lors du chargement des événements" });
  }
};

// ─── POST /events ────────────────────────────────────────────────────────────
const createEvent = async (req, res) => {
  try {
    const {
      title, description, start_date, end_date,
      visibility, color, participants, department,
      start_time, end_time,
    } = req.body;

    if (!title || !start_date) {
      return res.status(400).json({ message: "Titre et date de début requis" });
    }

    const startDateTime = start_time ? `${start_date} ${start_time}` : start_date;
    const endDateTime   = end_time   ? `${end_date || start_date} ${end_time}` : (end_date || start_date);

    const [result] = await db.query(`
      INSERT INTO events (title, description, start_date, end_date, visibility, created_by, color, all_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `, [title, description || null, startDateTime, endDateTime, visibility || "public", req.user.id, color || null]);

    const eventId = result.insertId;
    let emailRecipients = [];

    if (visibility === "public") {
      const [allUsers] = await db.query(`SELECT email, nom_complet, id FROM users WHERE deleted_at IS NULL`);
      emailRecipients = allUsers;
      for (const user of allUsers) {
        await db.query(
          `INSERT INTO event_participants (event_id, user_id, status, notified) VALUES (?, ?, 'accepted', 0)`,
          [eventId, user.id]
        );
      }
    } else if (visibility === "private" && participants?.length > 0) {
      for (const uid of participants) {
        await db.query(
          `INSERT INTO event_participants (event_id, user_id, status, notified) VALUES (?, ?, 'pending', 0)`,
          [eventId, uid]
        );
        const [userRows] = await db.query(`SELECT email, nom_complet, id FROM users WHERE id = ?`, [uid]);
        if (userRows.length > 0) emailRecipients.push(userRows[0]);
      }
    } else if (visibility === "department" && department) {
      const [deptUsers] = await db.query(
        `SELECT email, nom_complet, id FROM users WHERE departement = ? AND deleted_at IS NULL`,
        [department]
      );
      emailRecipients = deptUsers;
      for (const user of deptUsers) {
        await db.query(
          `INSERT INTO event_participants (event_id, user_id, status, notified) VALUES (?, ?, 'accepted', 0)`,
          [eventId, user.id]
        );
      }
    }

    if (emailRecipients.length > 0) {
      await sendEventEmails(eventId, title, description, startDateTime, endDateTime, visibility, emailRecipients, req.user.nom_complet);
    }

    res.status(201).json({ success: true, message: "Événement créé avec succès", eventId });
  } catch (error) {
    console.error("❌ Erreur createEvent:", error);
    res.status(500).json({ message: "Erreur lors de la création", error: error.message });
  }
};

// ─── PUT /events/:id ─────────────────────────────────────────────────────────
const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const { title, description, start_date, end_date, visibility, color, participants } = req.body;

    const [result] = await db.query(`
      UPDATE events SET
        title = ?, description = ?, start_date = ?, end_date = ?,
        visibility = ?, color = ?, updated_at = NOW()
      WHERE id = ? AND (created_by = ? OR ? = 'admin')
    `, [title, description, start_date, end_date, visibility, color, eventId, req.user.id, req.user.role]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Événement non trouvé ou non autorisé" });
    }

    if (participants?.length > 0) {
      await db.query(`DELETE FROM event_participants WHERE event_id = ?`, [eventId]);
      for (const uid of participants) {
        await db.query(
          `INSERT INTO event_participants (event_id, user_id, status, notified) VALUES (?, ?, 'pending', 0)`,
          [eventId, uid]
        );
      }
    }

    res.json({ success: true, message: "Événement mis à jour" });
  } catch (error) {
    console.error("❌ Erreur updateEvent:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
};

// ─── DELETE /events/:id ──────────────────────────────────────────────────────
const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const [result] = await db.query(
      "UPDATE events SET deleted_at = NOW() WHERE id = ? AND (created_by = ? OR ? = 'admin')",
      [eventId, req.user.id, req.user.role]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Événement non trouvé ou non autorisé" });
    }

    res.json({ success: true, message: "Événement supprimé" });
  } catch (error) {
    console.error("❌ Erreur deleteEvent:", error);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};

// ─── Rappels email (cron toutes les heures) ──────────────────────────────────
const checkAndSendReminders = async () => {
  try {
    const [events] = await db.query(`
      SELECT 
        e.id, e.title, e.description, e.start_date, e.end_date, e.visibility,
        u.id as user_id, u.email, u.nom_complet, e.created_by
      FROM events e
      LEFT JOIN event_participants ep ON e.id = ep.event_id
      LEFT JOIN users u ON (ep.user_id = u.id OR e.created_by = u.id)
      WHERE e.deleted_at IS NULL
        AND e.start_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
        AND e.reminder_sent = 0
        AND (e.visibility = 'public' OR ep.user_id IS NOT NULL)
    `);

    for (const event of events) {
      await sendReminderEmail(event);
      await db.query(`UPDATE events SET reminder_sent = 1 WHERE id = ?`, [event.id]);
    }
  } catch (error) {
    console.error("❌ Erreur checkAndSendReminders:", error);
  }
};

const sendReminderEmail = async (event) => {
  try {
    const transporter = createTransporter();
    if (!transporter) return false;

    const eventDate = new Date(event.start_date).toLocaleString("fr-FR", {
      weekday: "long", year: "numeric", month: "long",
      day: "numeric", hour: "2-digit", minute: "2-digit",
    });

    await transporter.sendMail({
      from:    `"Maison du Web" <${process.env.EMAIL_USER}>`,
      to:      event.email,
      subject: `⏰ Rappel: ${event.title} demain`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:10px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:20px;text-align:center">
            <h1 style="margin:0">⏰ Rappel d'événement</h1>
          </div>
          <div style="padding:20px">
            <h2>Bonjour ${event.nom_complet},</h2>
            <p>Cet événement aura lieu <strong>demain</strong> :</p>
            <div style="background:#fffbeb;padding:15px;border-radius:8px;border-left:4px solid #f59e0b">
              <h3>📌 ${event.title}</h3>
              ${event.description ? `<p>📝 ${event.description}</p>` : ""}
              <p>📅 ${eventDate}</p>
            </div>
            <a href="http://localhost:5173/calendar" style="display:inline-block;margin-top:15px;background:#f59e0b;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px">
              Voir dans mon calendrier
            </a>
          </div>
          <div style="padding:10px;text-align:center;font-size:12px;color:#666">
            © ${new Date().getFullYear()} Maison du Web
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("❌ Erreur envoi rappel:", error);
    return false;
  }
};

// ─── Email création événement ────────────────────────────────────────────────
async function sendEventEmails(eventId, title, description, start_date, end_date, visibility, recipients, createdBy) {
  try {
    const transporter = createTransporter();
    if (!transporter) return false;

    const startFmt = new Date(start_date).toLocaleString("fr-FR");
    const endFmt   = end_date ? new Date(end_date).toLocaleString("fr-FR") : null;

    for (const recipient of recipients) {
      if (!recipient.email) continue;
      await transporter.sendMail({
        from:    `"Maison du Web" <${process.env.EMAIL_USER}>`,
        to:      recipient.email,
        subject: `📅 Nouvel événement: ${title}`,
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:10px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);color:#fff;padding:20px;text-align:center">
              <h1 style="margin:0">📅 Nouvel événement</h1>
            </div>
            <div style="padding:20px">
              <h2>Bonjour ${recipient.nom_complet || "cher collègue"},</h2>
              <p><strong>${createdBy}</strong> a créé un nouvel événement :</p>
              <div style="background:#f0f4ff;padding:15px;border-radius:8px">
                <h3>📌 ${title}</h3>
                ${description ? `<p>📝 ${description}</p>` : ""}
                <p>📅 Début : ${startFmt}</p>
                ${endFmt ? `<p>⏰ Fin : ${endFmt}</p>` : ""}
              </div>
              <a href="http://localhost:5173/calendar" style="display:inline-block;margin-top:15px;background:#1d4ed8;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px">
                Voir le calendrier
              </a>
            </div>
            <div style="padding:10px;text-align:center;font-size:12px;color:#666">
              © ${new Date().getFullYear()} Maison du Web
            </div>
          </div>
        `,
      });
    }
    return true;
  } catch (error) {
    console.error("❌ Erreur envoi emails:", error);
    return false;
  }
}

// ─── Cron rappels ────────────────────────────────────────────────────────────
setInterval(checkAndSendReminders, 60 * 60 * 1000);
checkAndSendReminders();

// ─── Routes ──────────────────────────────────────────────────────────────────
router.use(verifyToken);

router.get("/users",         getUsers);
router.get("/departments",   getDepartments);
router.get("/events",        getEvents);
router.post("/events",       isChefProjet, createEvent);
router.put("/events/:id",    isChefProjet, updateEvent);
router.delete("/events/:id", isChefProjet, deleteEvent);

module.exports = router;