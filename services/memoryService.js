const { HumanMessage, AIMessage } = require('@langchain/core/messages');

const sessions = new Map();

const getUserMemory = (sessionId) => {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
        console.log(`📝 Nouvelle session: ${sessionId}`);
    }

    return {
        loadMemoryVariables: async () => ({
            chat_history: sessions.get(sessionId)
        }),

        saveContext: async ({ input }, { output }) => {
            const history = sessions.get(sessionId);

            if (!input || input.length < 2) return;

            history.push(new HumanMessage(input));
            history.push(new AIMessage(output));

            // 🔥 Trim
            if (history.length > 20) {
                history.splice(0, 2);
            }

            // 🔥 Summary
            if (history.length >= 20) {
                const summary = history
                    .map(m => m.content)
                    .join(" | ")
                    .slice(0, 500);

                sessions.set(`summary_${sessionId}`, [
                    new AIMessage("Résumé: " + summary)
                ]);

                sessions.set(sessionId, []);
                console.log("🧠 Summary créé");
            }

            console.log(`💾 Memory: ${history.length} messages`);
        }
    };
};

const getSummaryMemory = (sessionId) => {
    return {
        loadMemoryVariables: async () => ({
            chat_history: sessions.get(`summary_${sessionId}`) || []
        })
    };
};

const clearUserMemory = (sessionId) => {
    sessions.delete(sessionId);
    sessions.delete(`summary_${sessionId}`);
    console.log(`🗑️ Session effacée: ${sessionId}`);
};

module.exports = { getUserMemory, getSummaryMemory, clearUserMemory };