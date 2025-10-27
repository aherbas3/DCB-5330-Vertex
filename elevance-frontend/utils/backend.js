import { Platform } from "react-native";

const BACKEND_URL =
    Platform.OS === "web"
        ? "http://127.0.0.1:5050"
        : "http://172.20.10.15:5050";

export async function syncUser(token, userData = {}) {
    try {
        const res = await fetch(`${BACKEND_URL}/auth/sync`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(userData),
        });

        const data = await handleResponse(res);
        console.log(" Sync successful:", data);
        return data;
    } catch (error) {
        console.error(" Sync failed:", error);
        throw new Error(`Failed to sync user: ${error.message}`);
    }
}

export async function getUserProfile(token) {
    const res = await fetch(`${BACKEND_URL}/users/profile`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });
    return handleResponse(res);
}

export async function updateUserProfile(token, updates) {
    const res = await fetch(`${BACKEND_URL}/users/profile`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
    });
    return handleResponse(res);
}

export async function deleteAccount(token) {
    const res = await fetch(`${BACKEND_URL}/users/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
}

export async function checkUserExists(token) {
    const res = await fetch(`${BACKEND_URL}/users/check`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(res);
}



async function handleResponse(res) {
    let data;
    try {
        data = await res.json();
    } catch {
        data = { error: `HTTP ${res.status}: Response parsing failed` };
    }

    if (!res.ok) {
        const message = data.error || `Request failed with status ${res.status}`;
        const err = new Error(message);
        err.status = res.status;
        err.details = data.details || null;
        throw err;
    }

    return data;
}

export async function getProviders(token, queryParams) {
    const res = await fetch(`${BACKEND_URL}/providers/search?${queryParams}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch providers");
    return data;
}

export const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
};

export const isStrongPassword = (pwd) => {
    return pwd.length >= 8;
};

export const getPasswordStrength = (pwd) => {
    let strength = 0;

    // Length check
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;

    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
};

export const formatAuthError = (error) => {
    if (error.code) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                return 'This email is already registered';
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/weak-password':
                return 'Password is too weak';
            case 'auth/user-not-found':
                return 'No account found with this email';
            case 'auth/wrong-password':
                return 'Incorrect password';
            default:
                return error.message || 'Authentication failed';
        }
    }
    return error.message || 'An unexpected error occurred';
};

export { BACKEND_URL };
