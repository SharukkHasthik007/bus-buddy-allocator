import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bus } from "lucide-react";

const Login = () => {
  const [userType, setUserType] = useState<"student" | "faculty">("student");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem("userName", name);
      localStorage.setItem("userType", userType);
      navigate("/seats");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-2">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Bus className="w-10 h-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">Bus Seat Allocation</CardTitle>
          <CardDescription className="text-base">
            Select your user type and enter your name to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">I am a</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={userType === "student" ? "default" : "outline"}
                  className="h-14 text-base font-semibold"
                  onClick={() => setUserType("student")}
                >
                  Student
                </Button>
                <Button
                  type="button"
                  variant={userType === "faculty" ? "default" : "outline"}
                  className="h-14 text-base font-semibold"
                  onClick={() => setUserType("faculty")}
                >
                  Faculty
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12 text-base"
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold" size="lg">
              Continue to Seat Selection
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
