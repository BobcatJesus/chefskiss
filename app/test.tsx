import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { supabase } from '../supabase';

type Recipe = {
  id: string;
  title: string;
};

export default function Test() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*');

      if (error) {
        console.log('Supabase error:', error);
      } else {
        setRecipes((data ?? []) as Recipe[]);
      }
    };

    load();
  }, []);

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20 }}>Recipes:</Text>
      {recipes.map((r) => (
        <Text key={r.id}>{r.title}</Text>
      ))}
    </View>
  );
}
