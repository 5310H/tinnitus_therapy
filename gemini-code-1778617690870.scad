// V52.2-Right Master-Cut
// Optimized for Vybronics VG1030001XH 
// Resonant Freq: 210Hz | Mass Stabilized

module v52_2_right() {
    difference() {
        // 1. THE ERGONOMIC CHASSIS
        hull() {
            translate([-12, -10, 0]) cylinder(r=4, h=18, $fn=60);
            translate([12, -10, 0])  cylinder(r=4, h=18, $fn=60);
            translate([-12, 10, 0])  cylinder(r=4, h=18, $fn=60);
            translate([12, 10, 0])   cylinder(r=4, h=18, $fn=60);
        }

        // 2. THE MOTOR OPENING (Skin-Side)
        // Cut starts at -5 and goes to 8 to ensure it's hollow.
        translate([0, 0, -5]) 
            cylinder(d=10.2, h=13, $fn=100);

        // 3. THE BATTERY POD SLOT (Clip)
        // Widened to 16mm for easier "snap" fit with PETG
        translate([-18, -8, 5]) 
            cube([36, 16, 15]); 

        // 4. WIRE TRENCH (AWG 30 Exit)
        translate([0, -15, 2]) 
            cube([2.5, 20, 5], center=true);

        // 5. THE "R" MARKING (Deep Tactile Emboss)
        translate([0, 0, 16]) 
            linear_extrude(height = 5) 
                text("R", size=10, font="Arial:style=Bold", halign="center", valign="center");
    }
}

// EXECUTE
v52_2_right();