import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

import { useAuth } from "@/store/auth";
import { colors } from "@/theme";
import LoginScreen from "@/screens/LoginScreen";
import SearchScreen from "@/screens/SearchScreen";
import WordDetailScreen from "@/screens/WordDetailScreen";
import AddWordScreen from "@/screens/AddWordScreen";
import FavoritesScreen from "@/screens/FavoritesScreen";
import AdminScreen from "@/screens/AdminScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LogoutButton() {
  const logout = useAuth((s) => s.logout);
  return (
    <TouchableOpacity onPress={logout} style={{ marginRight: 12 }}>
      <Ionicons name="log-out-outline" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

function Tabs() {
  const role = useAuth((s) => s.user?.role);
  const canModerate = role === "moderateur" || role === "administrateur";
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: "#fff",
        tabBarActiveTintColor: colors.primary,
        headerRight: () => <LogoutButton />,
      }}
    >
      <Tab.Screen name="Recherche" component={SearchScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} /> }} />
      <Tab.Screen name="Ajouter" component={AddWordScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Favoris" component={FavoritesScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="star-outline" color={color} size={size} /> }} />
      {canModerate && (
        <Tab.Screen name="Admin" component={AdminScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark-outline" color={color} size={size} /> }} />
      )}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const user = useAuth((s) => s.user);
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: "#fff" }}
      >
        {user ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="WordDetail" component={WordDetailScreen} options={{ title: "Fiche du mot" }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
