import { Platform } from "react-native";

const BACKEND_URL =
    Platform.OS === "web"
        ? "http://127.0.0.1:5050"
        : "http://192.168.xx.xx:5050";


export async function syncUser(token) {
    const res = await fetch(`${BACKEND_URL}/auth/sync`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });
    return handleResponse(res);
}

export async function getProfile(token) {
    const res = await fetch(`${BACKEND_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
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


async function handleResponse(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}


export const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isStrongPassword = (pwd) => pwd.length >= 8;

export { BACKEND_URL };
