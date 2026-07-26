import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import RootNavigator from "@/navigation";
import { Loading } from "@/components/UI";
import { useAuth } from "@/store/auth";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
  const { hydrate, loading } = useAuth();
  useEffect(() => { hydrate(); }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        {loading ? <Loading /> : <RootNavigator />}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
