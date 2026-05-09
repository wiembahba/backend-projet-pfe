const db = require("../config/db");
const nodemailer = require("nodemailer");

// Configuration email
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("❌ Variables d'environnement EMAIL non définies");
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// ===================== GET EVENTS (selon rôle) =====================
exports.getEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let sql = "";
    let params = [userId, userId];
    
    if (userRole === "admin") {
      // Admin voit tout
      sql = `
        SELECT DISTINCT
          e.id, e.title, e.description, e.start_date, e.end_date,
          e.type, e.visibility, e.location, e.created_by,
          u.nom_complet as created_by_name,
          DATE_FORMAT(e.start_date, '%Y-%m-%d %H:%i:%s') as start,
          DATE_FORMAT(e.end_date, '%Y-%m-%d %H:%i:%s') as end,
          e.all_day,
          e.color
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.deleted_at IS NULL
        ORDER BY e.start_date ASC
      `;
      params = [];
    } 
    else if (userRole === "chef_projet") {
      // Chef voit: événements qu'il a créés + événements publics + événements de son département
      sql = `
        SELECT DISTINCT
          e.id, e.title, e.description, e.start_date, e.end_date,
          e.type, e.visibility, e.location, e.created_by,
          u.nom_complet as created_by_name,
          DATE_FORMAT(e.start_date, '%Y-%m-%d %H:%i:%s') as start,
          DATE_FORMAT(e.end_date, '%Y-%m-%d %H:%i:%s') as end,
          e.all_day,
          e.color
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN event_participants ep ON e.id = ep.event_id
        WHERE e.deleted_at IS NULL
        AND (
          e.created_by = ? 
          OR e.visibility = 'public'
          OR (e.visibility = 'department' AND e.department_id = (SELECT departement FROM users WHERE id = ?))
          OR ep.user_id = ?
        )
        ORDER BY e.start_date ASC
      `;
      params = [userId, userId, userId];
    }
    else {
      // Employé normal voit: événements publics + événements où il est participant
      sql = `
        SELECT DISTINCT
          e.id, e.title, e.description, e.start_date, e.end_date,
          e.type, e.visibility, e.location, e.created_by,
          u.nom_complet as created_by_name,
          DATE_FORMAT(e.start_date, '%Y-%m-%d %H:%i:%s') as start,
          DATE_FORMAT(e.end_date, '%Y-%m-%d %H:%i:%s') as end,
          e.all_day,
          e.color
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN event_participants ep ON e.id = ep.event_id
        WHERE e.deleted_at IS NULL
        AND (
          e.visibility = 'public'
          OR ep.user_id = ?
        )
        ORDER BY e.start_date ASC
      `;
      params = [userId];
    }
    
    const [events] = await db.query(sql, params);
    
    // Formater pour FullCalendar
    const formattedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.all_day === 1,
      extendedProps: {
        description: event.description,
        location: event.location,
        type: event.type,
        visibility: event.visibility,
        created_by: event.created_by,
        created_by_name: event.created_by_name,
        color: event.color
      },
      backgroundColor: event.color || getColorByType(event.type),
      borderColor: event.color || getColorByType(event.type)
    }));
    
    res.json({ success: true, events: formattedEvents });
    
  } catch (error) {
    console.error("❌ Erreur getEvents:", error);
    res.status(500).json({ message: "Erreur lors du chargement des événements" });
  }
};

// ===================== GET EVENT BY ID =====================
exports.getEventById = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const [events] = await db.query(`
      SELECT 
        e.*,
        u.nom_complet as created_by_name,
        DATE_FORMAT(e.start_date, '%Y-%m-%d %H:%i:%s') as start,
        DATE_FORMAT(e.end_date, '%Y-%m-%d %H:%i:%s') as end
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = ? AND e.deleted_at IS NULL
    `, [eventId]);
    
    if (events.length === 0) {
      return res.status(404).json({ message: "Événement non trouvé" });
    }
    
    const event = events[0];
    
    // Vérifier les droits d'accès
    let canAccess = false;
    if (userRole === "admin") canAccess = true;
    else if (event.created_by === userId) canAccess = true;
    else if (event.visibility === "public") canAccess = true;
    else if (event.visibility === "private") {
      const [participants] = await db.query(
        "SELECT * FROM event_participants WHERE event_id = ? AND user_id = ?",
        [eventId, userId]
      );
      canAccess = participants.length > 0;
    }
    
    if (!canAccess) {
      return res.status(403).json({ message: "Accès non autorisé à cet événement" });
    }
    
    res.json({ success: true, event });
    
  } catch (error) {
    console.error("❌ Erreur getEventById:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ===================== CREATE EVENT =====================
exports.createEvent = async (req, res) => {
  try {
    const {
      title, description, start_date, end_date,
      type, visibility, location, all_day,
      department_id, participants, color
    } = req.body;
    
    const created_by = req.user.id;
    
    // Validation
    if (!title || !start_date) {
      return res.status(400).json({ message: "Titre et date de début requis" });
    }
    
    // Insertion de l'événement
    const [result] = await db.query(`
      INSERT INTO events (
        title, description, start_date, end_date, type,
        visibility, location, all_day, created_by, department_id, color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title, description || null, start_date, end_date || null,
      type || "meeting", visibility || "public", location || null,
      all_day ? 1 : 0, created_by, department_id || null, color || null
    ]);
    
    const eventId = result.insertId;
    
    // Ajouter les participants si spécifiés
    let participantsList = [];
    if (participants && participants.length > 0) {
      for (const userId of participants) {
        await db.query(
          "INSERT INTO event_participants (event_id, user_id, status, notified) VALUES (?, ?, 'pending', 0)",
          [eventId, userId]
        );
        participantsList.push(userId);
      }
    }
    
    // Récupérer les infos complètes de l'événement
    const [newEvent] = await db.query(`
      SELECT e.*, u.nom_complet as created_by_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = ?
    `, [eventId]);
    
    // Envoyer des emails aux participants
    await sendEventNotification(eventId, newEvent[0], participantsList, "create");
    
    res.status(201).json({
      success: true,
      message: "Événement créé avec succès",
      event: newEvent[0]
    });
    
  } catch (error) {
    console.error("❌ Erreur createEvent:", error);
    res.status(500).json({ message: "Erreur lors de la création de l'événement" });
  }
};

// ===================== UPDATE EVENT =====================
exports.updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const {
      title, description, start_date, end_date,
      type, visibility, location, all_day, color
    } = req.body;
    
    // Vérifier si l'événement existe
    const [events] = await db.query(
      "SELECT * FROM events WHERE id = ? AND deleted_at IS NULL",
      [eventId]
    );
    
    if (events.length === 0) {
      return res.status(404).json({ message: "Événement non trouvé" });
    }
    
    // Mise à jour
    await db.query(`
      UPDATE events SET
        title = ?, description = ?, start_date = ?, end_date = ?,
        type = ?, visibility = ?, location = ?, all_day = ?, color = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      title, description, start_date, end_date,
      type, visibility, location, all_day ? 1 : 0, color, eventId
    ]);
    
    // Notifier les participants de la modification
    const [participants] = await db.query(
      "SELECT user_id FROM event_participants WHERE event_id = ?",
      [eventId]
    );
    
    const [updatedEvent] = await db.query(
      "SELECT e.*, u.nom_complet as created_by_name FROM events e LEFT JOIN users u ON e.created_by = u.id WHERE e.id = ?",
      [eventId]
    );
    
    const participantIds = participants.map(p => p.user_id);
    await sendEventNotification(eventId, updatedEvent[0], participantIds, "update");
    
    res.json({
      success: true,
      message: "Événement mis à jour avec succès",
      event: updatedEvent[0]
    });
    
  } catch (error) {
    console.error("❌ Erreur updateEvent:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
};

// ===================== DELETE EVENT =====================
exports.deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    
    // Soft delete
    await db.query(
      "UPDATE events SET deleted_at = NOW() WHERE id = ?",
      [eventId]
    );
    
    res.json({
      success: true,
      message: "Événement supprimé avec succès"
    });
    
  } catch (error) {
    console.error("❌ Erreur deleteEvent:", error);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};

// ===================== ADD PARTICIPANTS =====================
exports.addParticipants = async (req, res) => {
  try {
    const eventId = req.params.id;
    const { userIds } = req.body;
    
    if (!userIds || userIds.length === 0) {
      return res.status(400).json({ message: "Liste d'utilisateurs requise" });
    }
    
    const addedUsers = [];
    for (const userId of userIds) {
      // Vérifier si déjà participant
      const [existing] = await db.query(
        "SELECT id FROM event_participants WHERE event_id = ? AND user_id = ?",
        [eventId, userId]
      );
      
      if (existing.length === 0) {
        await db.query(
          "INSERT INTO event_participants (event_id, user_id, status, notified) VALUES (?, ?, 'pending', 0)",
          [eventId, userId]
        );
        addedUsers.push(userId);
      }
    }
    
    // Récupérer l'événement
    const [event] = await db.query(
      "SELECT * FROM events WHERE id = ?",
      [eventId]
    );
    
    // Envoyer notifications
    if (addedUsers.length > 0) {
      await sendEventNotification(eventId, event[0], addedUsers, "invite");
    }
    
    res.json({
      success: true,
      message: `${addedUsers.length} participant(s) ajouté(s)`,
      added: addedUsers.length
    });
    
  } catch (error) {
    console.error("❌ Erreur addParticipants:", error);
    res.status(500).json({ message: "Erreur lors de l'ajout des participants" });
  }
};

// ===================== GET PARTICIPANTS =====================
exports.getParticipants = async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const [participants] = await db.query(`
      SELECT 
        ep.user_id, ep.status, ep.notified, ep.responded_at,
        u.nom_complet, u.email, u.role, u.departement
      FROM event_participants ep
      JOIN users u ON ep.user_id = u.id
      WHERE ep.event_id = ?
      ORDER BY u.nom_complet ASC
    `, [eventId]);
    
    res.json({ success: true, participants });
    
  } catch (error) {
    console.error("❌ Erreur getParticipants:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ===================== UPDATE PARTICIPANT STATUS =====================
exports.updateParticipantStatus = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.params.userId;
    const { status } = req.body;
    
    if (!["pending", "accepted", "declined"].includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }
    
    await db.query(`
      UPDATE event_participants 
      SET status = ?, responded_at = NOW()
      WHERE event_id = ? AND user_id = ?
    `, [status, eventId, userId]);
    
    res.json({
      success: true,
      message: `Statut mis à jour: ${status}`
    });
    
  } catch (error) {
    console.error("❌ Erreur updateParticipantStatus:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ===================== SEND EVENT NOTIFICATION EMAILS =====================
async function sendEventNotification(eventId, event, userIds, action) {
  try {
    const transporter = createTransporter();
    if (!transporter) return false;
    
    for (const userId of userIds) {
      const [users] = await db.query(
        "SELECT nom_complet, email FROM users WHERE id = ?",
        [userId]
      );
      
      if (users.length === 0) continue;
      
      const user = users[0];
      
      let subject = "";
      let actionText = "";
      let buttonText = "";
      
      switch(action) {
        case "create":
          subject = "📅 Nouvel événement créé";
          actionText = "a créé un nouvel événement";
          buttonText = "Voir l'événement";
          break;
        case "update":
          subject = "🔄 Événement modifié";
          actionText = "a modifié un événement";
          buttonText = "Voir les modifications";
          break;
        case "invite":
          subject = "📧 Invitation à un événement";
          actionText = "vous a invité à un événement";
          buttonText = "Répondre à l'invitation";
          break;
        default:
          subject = "📅 Notification d'événement";
          actionText = "vous concerne";
          buttonText = "Voir les détails";
      }
      
      const mailOptions = {
        from: `"Maison du Web" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: `${subject}: ${event.title}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
              .header { background: ${event.color || '#5b6cff'}; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { padding: 20px; }
              .event-details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .btn { display: inline-block; background: ${event.color || '#5b6cff'}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
              .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${subject}</h1>
              </div>
              <div class="content">
                <h2>Bonjour ${user.nom_complet},</h2>
                <p><strong>${req.user?.nom_complet || "L'administrateur"}</strong> ${actionText}:</p>
                
                <div class="event-details">
                  <h3>📌 ${event.title}</h3>
                  ${event.description ? `<p>📝 ${event.description}</p>` : ''}
                  <p>📅 Date: ${new Date(event.start_date).toLocaleString('fr-FR')}</p>
                  ${event.end_date ? `<p>⏰ Jusqu'au: ${new Date(event.end_date).toLocaleString('fr-FR')}</p>` : ''}
                  ${event.location ? `<p>📍 Lieu: ${event.location}</p>` : ''}
                  </div>
                
                <p>Connectez-vous à votre espace pour plus de détails.</p>
                
                <a href="http://localhost:5173/calendar" class="btn">Voir le calendrier</a>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Maison du Web. Tous droits réservés.</p>
                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };
      
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email envoyé à ${user.email}`);
      
      // Marquer comme notifié
      await db.query(
        "UPDATE event_participants SET notified = 1 WHERE event_id = ? AND user_id = ?",
        [eventId, userId]
      );
    }
    
    return true;
  } catch (error) {
    console.error("❌ Erreur sendEventNotification:", error);
    return false;
  }
}

// Helper: couleur par défaut selon le type
function getColorByType(type) {
  const colors = {
    meeting: "#5b6cff",
    reunion: "#5b6cff",
    training: "#10b981",
    formation: "#10b981",
    deadline: "#ef4444",
    deadline: "#ef4444",
    event: "#f59e0b",
    autre: "#6b7280"
  };
  return colors[type] || "#5b6cff";
}