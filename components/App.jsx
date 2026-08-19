import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BecomeACook from './pages/BecomeACook'; // Adjust path to your page

function App() {
  return (
    <Router>
      <Routes>
        {/* Your existing routes */}
        <Route path="/become-a-cook" element={<BecomeACook />} />
      </Routes>
    </Router>
  );
}useEffect(() => {
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
