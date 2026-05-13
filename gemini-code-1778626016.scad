// V53-Right Pacer "Force-Cut" Version
// For Vybronics VG1030001XH 

difference() {
    // 1. THE MAIN BLOCK (Rounded for comfort)
    hull() {
        translate([-12, -10, 0]) cylinder(r=4, h=18, $fn=50);
        translate([12, -10, 0])  cylinder(r=4, h=18, $fn=50);
        translate([-12, 10, 0])  cylinder(r=4, h=18, $fn=50);
        translate([12, 10, 0])   cylinder(r=4, h=18, $fn=50);
    }

    // 2. THE MOTOR THROUGH-HOLE (Drills all the way through)
    // We start at Z=-5 to ensure the bottom face is deleted
    translate([0, 0, -5]) 
        cylinder(d=10.2, h=15, $fn=100);

    // 3. THE BATTERY POD SLOT (The Clip)
    // We make the cube extra long (40mm) so it clears the side walls
    translate([-20, -8, 6]) 
        cube([40, 16, 15]); 

    // 4. WIRE TRENCH (Prevents wire snap)
    translate([0, -15, 2]) 
        cube([3, 20, 6], center=true);

    // 5. THE "R" MARKING
    // Cut 5mm deep to guarantee it appears in the STL
    translate([0, 0, 16]) 
        linear_extrude(height = 5) 
            text("R", size=10, font="Arial:style=Bold", halign="center", valign="center");
}