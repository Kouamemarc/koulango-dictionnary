import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme";
import { HeaderLogo } from "@/components/HeaderLogo";
import SearchScreen from "@/screens/SearchScreen";
import WordDetailScreen from "@/screens/WordDetailScreen";
import AddWordScreen from "@/screens/AddWordScreen";
import FavoritesScreen from "@/screens/FavoritesScreen";
import HistoryScreen from "@/screens/HistoryScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleAlign: "left",
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen name="Accueil" component={SearchScreen}
        options={{
          headerTitle: () => <HeaderLogo />,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }} />
      <Tab.Screen name="Favoris" component={FavoritesScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Contribuer" component={AddWordScreen}
        options={{
          title: "Proposition de mot ou expression",
          tabBarLabel: "Contribuer",
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" color={color} size={size} />,
        }} />
      <Tab.Screen name="Historique" component={HistoryScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="WordDetail" component={WordDetailScreen} options={{ title: "Fiche du mot" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
