type FoodCategoryRule = {
  category: string;
  keywords: string[];
};

const FOOD_CATEGORY_RULES: FoodCategoryRule[] = [
  { category: 'italian', keywords: ['meatball', 'meatball sub', 'meatball subs', 'meatball sub sandwich', 'italian sub', 'lasagna', 'pasta', 'spaghetti', 'ravioli', 'risotto', 'pizza', 'parmesan', 'parmigiana', 'carbonara', 'alfredo', 'bruschetta', 'gnocchi'] },
  { category: 'mexican', keywords: ['taco', 'burrito', 'enchilada', 'quesadilla', 'tamale', 'pozole', 'churro', 'fajita', 'salsa', 'guacamole'] },
  { category: 'indian', keywords: ['curry', 'rice curry', 'curry rice', 'coconut curry', 'chicken curry', 'paneer curry', 'masala', 'tikka', 'naan', 'paneer', 'biryani', 'samosa', 'dal', 'dahl', 'vindaloo', 'pakora', 'chai'] },
  { category: 'west african', keywords: ['jollof', 'suya', 'egusi', 'fufu', 'plantain', 'waakye', 'yassa', 'peanut stew'] },
  { category: 'middle eastern', keywords: ['falafel', 'hummus', 'shawarma', 'kebab', 'kibbeh', 'tabbouleh', 'baklava', 'kofta'] },
  { category: 'thai', keywords: ['pad thai', 'satay', 'tom yum', 'tom kha', 'green curry', 'red curry', 'massaman'] },
  { category: 'chinese', keywords: ['dumpling', 'wonton', 'fried rice', 'kung pao', 'chow mein', 'lo mein', 'bao', 'spring roll'] },
  { category: 'japanese', keywords: ['sushi', 'ramen', 'teriyaki', 'tempura', 'udon', 'miso', 'yakitori', 'onigiri'] },
  { category: 'korean', keywords: ['bibimbap', 'bulgogi', 'kimchi', 'tteokbokki', 'japchae', 'korean fried chicken'] },
  { category: 'american', keywords: ['burger', 'meatloaf', 'mac and cheese', 'macaroni and cheese', 'hot dog', 'cornbread', 'pot roast', 'pulled pork'] },
  { category: 'barbecue', keywords: ['bbq', 'barbecue', 'brisket', 'ribs', 'smoked', 'grilled', 'pulled pork'] },
  { category: 'seafood', keywords: ['fish', 'salmon', 'shrimp', 'prawn', 'crab', 'lobster', 'tuna', 'cod', 'tilapia', 'clam', 'oyster'] },
  { category: 'vegetarian', keywords: ['vegetarian', 'veggie', 'tofu', 'tempeh', 'lentil', 'chickpea', 'falafel', 'paneer'] },
  { category: 'vegan', keywords: ['vegan', 'plant-based', 'plant based'] },
  { category: 'dessert', keywords: ['cake', 'cookie', 'brownie', 'pie', 'pudding', 'ice cream', 'cheesecake', 'tart', 'muffin', 'sweet'] },
  { category: 'breakfast', keywords: ['pancake', 'waffle', 'omelet', 'omelette', 'french toast', 'breakfast', 'brunch'] },
];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchesKeyword(text: string, keyword: string): boolean {
  const normalizedKeyword = normalize(keyword);

  if (!normalizedKeyword) {
    return false;
  }

  return text.includes(normalizedKeyword);
}

export function inferFoodCategories(title: string, description: string): string[] {
  const text = normalize(`${title} ${description}`);
  const categories = FOOD_CATEGORY_RULES
    .filter((rule) => rule.keywords.some((keyword) => matchesKeyword(text, keyword)))
    .map((rule) => rule.category);

  if (!categories.some((category) => ['dessert', 'breakfast'].includes(category))) {
    categories.push('savory');
  }

  return categories;
}
