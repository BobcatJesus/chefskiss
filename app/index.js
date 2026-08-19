
import { useEffect } from "react";
import { supabase } from "../supabase"; // I’ll adjust this path once you tell me the file name
import { View, Text } from "react-native";






import { useEffect } from "react";
import { View, Text } from "react-native";
import { supabase } from "./supabase";  // ← correct path because both files are in /app

export default function Index() {

  useEffect(() => {
    async function test() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      console.log("DATA:", data);
      console.log("ERROR:", error);
    }

    test();
  }, []);

  return (
    <View>
      <Text>Hello Thomas</Text>
    </View>
  );
}




export default function Index() {
  return (
    <View>
      ...
    </View>
  );
}


import { useEffect } from "react";
import { supabase } from "../supabase"; // adjust path if needed

export default function Index() {

  useEffect(() => {
    async function test() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      console.log("DATA:", data);
      console.log("ERROR:", error);
    }

    test();
  }, []);

  return (
    <View>
      <Text>Hello Thomas</Text>
    </View>
  );
}
export default function Index() {
  return (
    <View>
      <Text>...</Text>
    </View>
  );
}
import { useEffect } from "react";
import { supabase } from "../supabase"; // adjust if your file is named differently
import { View, Text } from "react-native";

export default function Index() {

  useEffect(() => {
    async function test() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      console.log("DATA:", data);
      console.log("ERROR:", error);
    }

    test();
  }, []);

  return (
    <View>
      <Text>Hello Thomas</Text>
    </View>
  );
}
import { useEffect } from "react";
import { supabase } from "../supabase"; // adjust if your file is named differently
import { View, Text } from "react-native";

export default function Index() {

  useEffect(() => {
    async function test() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      console.log("DATA:", data);
      console.log("ERROR:", error);
    }

    test();
  }, []);

  return (
    <View>
      <Text>Hello Thomas</Text>
    </View>
  );
}
export default function Index() {
  return (
    <View>
      <Text>...</Text>
    </View>
  );
}



export default function Index() {
  return (
    <View>
      <Text>...</Text>
    </View>
  );
}




import { useEffect } from "react";
import { supabase } from "../supabase"; // adjust if your file is named differently
import { View, Text } from "react-native";

export default function Index() {

  useEffect(() => {
    async function test() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      console.log("DATA:", data);
      console.log("ERROR:", error);
    }

    test();
  }, []);

  return (
    <View>
      <Text>Hello Thomas</Text>
    </View>
  );
}



import { useEffect } from "react";
import { View, Text } from "react-native";
import { supabase } from "./supabase";  // correct path because both files are in /app

export default function Index() {

  useEffect(() => {
    async function test() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      console.log("DATA:", data);
      console.log("ERROR:", error);
    }

    test();
  }, []);

  return (
    <View>
      <Text>Hello Thomas</Text>
    </View>
  );
}




import { useEffect } from "react";
import { View, Text } from "react-native";
import { supabase } from "./supabase";  // correct path because both files are in /app

export default function Index() {

  useEffect(() => {
    async function test() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      console.log("DATA:", data);
      console.log("ERROR:", error);
    }

    test();
  }, []);

  return (
    <View>
      <Text>Hello Thomas</Text>
    </View>
  );
}
//  { supabase } from "./supabase";
