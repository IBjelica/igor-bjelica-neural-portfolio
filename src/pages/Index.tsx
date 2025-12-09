import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    // Redirect to the static portfolio
    window.location.href = "/index.html";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#050509' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading portfolio...</p>
      </div>
    </div>
  );
};

export default Index;
