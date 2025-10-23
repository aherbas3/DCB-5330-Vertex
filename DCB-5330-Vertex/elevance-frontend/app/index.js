import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function Index() {
    const router = useRouter();

    useEffect(() => {
        // Always redirect to signin page when app loads
        router.replace("/signin");
    }, []);

    return null; // This component doesn't render anything
}
