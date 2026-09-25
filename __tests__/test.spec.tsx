import { render, waitFor } from '@testing-library/react-native';

import Test from '../app/test';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Test screen', () => {
  it('renders recipe list from Supabase', async () => {
    const mockData = [
      { id: '1', title: 'Jollof Rice' },
      { id: '2', title: 'Chicken Curry' },
    ];

    const fromMock = supabase.from as jest.Mock;
    fromMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: mockData,
        error: null,
      }),
    });

    const { getByText } = await render(<Test />);

    expect(getByText('Recipes:')).toBeTruthy();

    await waitFor(() => {
      expect(getByText('Jollof Rice')).toBeTruthy();
      expect(getByText('Chicken Curry')).toBeTruthy();
    });
  });
});

import { inferFoodCategories } from '../features/meals/foodCategories';

describe('inferFoodCategories', () => {
  it('treats meatball subs as italian food', () => {
    expect(inferFoodCategories('Meatball Subs', 'Big toasted subs with marinara and mozzarella')).toContain('italian');
  });

  it('treats curry rice dishes as indian food', () => {
    expect(inferFoodCategories('Rice Curry Bowl', 'A creamy curry with fragrant rice and warm spices')).toContain('indian');
  });
});
