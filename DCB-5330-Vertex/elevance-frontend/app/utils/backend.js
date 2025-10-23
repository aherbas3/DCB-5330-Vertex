import { Platform } from "react-native";

const BACKEND_URL =
    Platform.OS === "web"
        ? "http://127.0.0.1:5050"
        : "http://192.168.xx.xx:5050";

export async function syncUser(token) {
    try {
        const res = await fetch(`${BACKEND_URL}/auth/sync`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({})
        });

        const data = await handleResponse(res);
        console.log("Sync successful:", data);
        return data;
    } catch (error) {
        console.error("Sync failed:", error);
        throw new Error(`Failed to sync user: ${error.message}`);
    }
}

export async function getProfile(token) {
    const res = await fetch(`${BACKEND_URL}/users/profile`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
    });
    return handleResponse(res);
}

export async function updateProfile(token, updates) {
    const res = await fetch(`${BACKEND_URL}/users/profile`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates),
    });
    return handleResponse(res);
}

export async function deleteAccount(token) {
    const res = await fetch(`${BACKEND_URL}/users/account`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`
        },
    });
    return handleResponse(res);
}

export async function checkUserExists(token) {
    const res = await fetch(`${BACKEND_URL}/users/check`, {
        headers: {
            Authorization: `Bearer ${token}`
        },
    });
    return handleResponse(res);
}

// PostgreSQL-specific functions
export async function getPostgresProfile(token) {
    const res = await fetch(`${BACKEND_URL}/postgres-users/profile`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
    });
    return handleResponse(res);
}

export async function updatePostgresProfile(token, updates) {
    const res = await fetch(`${BACKEND_URL}/postgres-users/profile`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates),
    });
    return handleResponse(res);
}

export async function syncToPostgres(token, userData) {
    const res = await fetch(`${BACKEND_URL}/postgres-users/sync`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(userData),
    });
    return handleResponse(res);
}

export async function checkPostgresUserExists(token) {
    const res = await fetch(`${BACKEND_URL}/postgres-users/check`, {
        headers: {
            Authorization: `Bearer ${token}`
        },
    });
    return handleResponse(res);
}

async function handleResponse(res) {
    let data;
    try {
        data = await res.json();
    } catch (jsonError) {
        data = { error: `HTTP ${res.status}: Response parsing failed` };
    }

    if (!res.ok) {
        const errorMessage = data.error || `Request failed with status ${res.status}`;
        const error = new Error(errorMessage);
        error.status = res.status;
        error.details = data.details || null;
        throw error;
    }

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