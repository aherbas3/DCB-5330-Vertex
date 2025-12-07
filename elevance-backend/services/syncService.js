const { db } = require("../firebase");
const UserService = require("./userService");

class SyncService {
    static async syncFirebaseToFirestore(decodedUser) {
        const { uid, email, email_verified } = decodedUser;
        const ref = db.collection("users").doc(uid);
        const doc = await ref.get();

        let isNewUser = false;

        if (doc.exists) {
            await ref.update({
                lastLogin: new Date().toISOString(),
                loginCount: (doc.data().loginCount || 0) + 1,
                emailVerified: email_verified || false,
            });
        } else {
            await ref.set({
                uid,
                email,
                emailVerified: email_verified || false,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                loginCount: 1,
            });
            isNewUser = true;
        }

        return { email, isNewUser, uid };
    }

    static async mirrorToPostgres({ email, isNewUser, uid }) {
        const data = {
            firebase_uid: uid,
            first_name: email.split("@")[0],
            last_name: "User",
            email,
            phone_number: "999-999-9999",
            language: "English",
            notifications_enabled: true,
            notification_method: "SMS", // Default to SMS
        };

        const exists = await UserService.userExists(email);
        if (!exists) await UserService.createUser(data);
        else if (isNewUser) await UserService.updateUser(email, data);
    }
}

module.exports = SyncService;
