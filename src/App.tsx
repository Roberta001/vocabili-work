import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Header from "@/components/layout/Header";
import Mark from "@/views/Mark";
import Upload from "@/views/Upload";
import Edit from "@/views/Edit";

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Header />
        <main className="w-full grow">
          <Routes>
            <Route path="/" element={<Upload />} />
            <Route path="/mark" element={<Mark />} />
            <Route path="/edit" element={<Edit />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
