// V52.1-Right Pacer - Deep Cut Version
// Specifically for Vybronics VG1030001XH 

module v52_1_right() {
    difference() {
        // 1. THE MAIN BODY (The "Block")
        hull() {
            translate([-11, -9, 0])  cylinder(r=4, h=18, $fn=60);
            translate([11, -9, 0])   cylinder(r=4, h=18, $fn=60);
            translate([-11, 9, 0])   cylinder(r=4, h=18, $fn=60);
            translate([11, 9, 0])    cylinder(r=4, h=18, $fn=60);
        }

        // 2. THE MOTOR HOLE (The "Opening")
        // We start the cut at Z = -2 and go to Z = 8 to ensure it breaks the surface
        translate([0, 0, -2]) 
            cylinder(d=10.2, h=10, $fn=100);

        // 3. THE BATTERY POD SLOT (The "Clip")
        // This hollows out the core so it can snap onto the headphones
        translate([-16, -7.5, 6]) 
            cube([32, 15, 15]); 

        // 4. WIRE TRENCH (AWG 30 Exit)
        translate([0, -15, 1.5]) 
            cube([2, 20, 5], center=true);

        // 5. THE "R" MARKING (Deep Emboss)
        // Carved 3mm deep to ensure it shows up in the STL
        translate([0, 0, 16]) 
            linear_extrude(height = 4) 
                text("R", size=9, font="Arial:style=Bold", halign="center", valign="center");
    }
}

v52_1_right();