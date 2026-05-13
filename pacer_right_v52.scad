// V52-R Ergo-Snap
// Specifically for Vybronics VG1030001XH (10mm x 3mm)

module v52_right_final() {
    difference() {
        // 1. THE ERGONOMIC BODY (Solid Base)
        hull() {
            translate([-11, -9, 0])  cylinder(r=4, h=18, $fn=60);
            translate([11, -9, 0])   cylinder(r=4, h=18, $fn=60);
            translate([-11, 9, 0])   cylinder(r=4, h=18, $fn=60);
            translate([11, 9, 0])    cylinder(r=4, h=18, $fn=60);
        }

        // 2. THE MOTOR "OPENING" (This is the hole you were missing)
        // Set to 10.2mm for a perfect press-fit.
        // It cuts through the bottom 5mm to let the motor touch skin.
        translate([0, 0, -1]) 
            cylinder(d=10.2, h=6, $fn=100);

        // 3. THE BATTERY POD SLOT (Internal Clip)
        // This hallows out the middle so it snaps onto the headphones.
        translate([-15, -7.5, 5]) 
            cube([30, 15, 14]); 

        // 4. WIRE CHANNEL
        // Tiny exit for the AWG 30 wires.
        translate([0, -12, 1.5]) 
            cube([1.5, 10, 3], center=true);

        // 5. EMBOSSED "R" IDENTIFIER
        // Subtracted 1.5mm into the top surface.
        translate([0, 0, 17]) 
            linear_extrude(height = 2) 
                text("R", size=9, font="Arial:style=Bold", halign="center", valign="center");
    }
}

v52_right_final();