import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bus, LogOut, MapPin } from "lucide-react";

type SeatType = "faculty" | "girl" | "boy" | "user" | "available";

interface Seat {
  number: number;
  type: SeatType;
  occupiedBy?: string;
}

const Seats = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [userType, setUserType] = useState("");
  const [seats, setSeats] = useState<Seat[]>([]);

  useEffect(() => {
    const name = localStorage.getItem("userName");
    const type = localStorage.getItem("userType");

    if (!name || !type) {
      navigate("/");
      return;
    }

    setUserName(name);
    setUserType(type);

    // Initialize 50 seats
    const initialSeats: Seat[] = [];
    
    // Faculty seats (seats 1-5)
    for (let i = 1; i <= 5; i++) {
      initialSeats.push({
        number: i,
        type: i === 3 ? "user" : "faculty",
        occupiedBy: i === 3 ? name : `Faculty ${i}`,
      });
    }

    // Girls seats (seats 6-15)
    for (let i = 6; i <= 15; i++) {
      initialSeats.push({
        number: i,
        type: i === 10 && type === "student" ? "user" : "girl",
        occupiedBy: i === 10 && type === "student" ? name : `Student ${i}`,
      });
    }

    // Boys seats (seats 16-40)
    for (let i = 16; i <= 40; i++) {
      const isOccupied = i % 3 !== 0;
      initialSeats.push({
        number: i,
        type: i === 25 && type === "student" ? "user" : isOccupied ? "boy" : "available",
        occupiedBy: i === 25 && type === "student" ? name : isOccupied ? `Student ${i}` : undefined,
      });
    }

    // Mixed seats (seats 41-50)
    for (let i = 41; i <= 50; i++) {
      const isOccupied = i % 2 === 0;
      initialSeats.push({
        number: i,
        type: isOccupied ? "boy" : "available",
        occupiedBy: isOccupied ? `Student ${i}` : undefined,
      });
    }

    setSeats(initialSeats);
  }, [navigate, userType]);

  const handleLogout = () => {
    localStorage.removeItem("userName");
    localStorage.removeItem("userType");
    navigate("/");
  };

  const getSeatColor = (type: SeatType) => {
    switch (type) {
      case "faculty":
        return "bg-seat-faculty hover:bg-seat-faculty/80";
      case "girl":
        return "bg-seat-girl hover:bg-seat-girl/80";
      case "boy":
        return "bg-seat-boy hover:bg-seat-boy/80";
      case "user":
        return "bg-seat-user hover:bg-seat-user/80 ring-4 ring-accent/50";
      case "available":
        return "bg-seat-available hover:bg-seat-available/80";
      default:
        return "bg-seat-occupied";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-lg border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Bus className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">Bus #A-42</CardTitle>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">Main Campus ↔ North Gate</span>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </CardHeader>
        </Card>

        {/* User Info */}
        <Card className="shadow-lg border-2">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Passenger Name</p>
                <p className="text-lg font-semibold">{userName}</p>
              </div>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {userType === "faculty" ? "Faculty Member" : "Student"}
              </Badge>
              <div className="ml-auto">
                <p className="text-sm text-muted-foreground">Your Seat</p>
                <p className="text-2xl font-bold text-accent">
                  {seats.find(s => s.type === "user")?.number || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seat Layout */}
        <Card className="shadow-lg border-2">
          <CardHeader>
            <CardTitle>Seat Layout</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Driver Section */}
            <div className="mb-6 flex items-center gap-4">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-border">
                <span className="text-xs font-semibold text-muted-foreground">Driver</span>
              </div>
              <div className="flex-1 h-0.5 bg-border" />
            </div>

            {/* Seats Grid */}
            <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
              {seats.map((seat) => (
                <button
                  key={seat.number}
                  className={`
                    relative aspect-square rounded-xl transition-all duration-200
                    ${getSeatColor(seat.type)}
                    flex flex-col items-center justify-center
                    text-white font-semibold shadow-md
                    transform hover:scale-105
                  `}
                  title={seat.occupiedBy || "Available"}
                >
                  <span className="text-lg">{seat.number}</span>
                  {seat.occupiedBy && (
                    <span className="text-[10px] opacity-90 mt-0.5 truncate max-w-full px-1">
                      {seat.occupiedBy.split(" ")[0]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm font-semibold mb-3">Legend</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-seat-faculty" />
                  <span className="text-sm">Faculty</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-seat-girl" />
                  <span className="text-sm">Girls</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-seat-boy" />
                  <span className="text-sm">Boys</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-seat-user ring-4 ring-accent/50" />
                  <span className="text-sm">Your Seat</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-seat-available" />
                  <span className="text-sm">Available</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Seats;
