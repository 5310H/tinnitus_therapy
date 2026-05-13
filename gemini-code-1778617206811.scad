// V52.1-Right Pacer
// Optimized for 10mm x 3mm LRA 
// Use PETG for flexibility in the clips

module v52_1_right() {
    difference() {
        // 1. MAIN BODY - Rounded Ergo Shape
        hull() {
            translate([-11, -9, 0])  cylinder(r=4, h=18, $fn=60);
            translate([11, -9, 0])   cylinder(r=4, h=18, $fn=60);
            translate([-11, 9, 0])   cylinder(r=4, h=18, $fn=60);
            translate([11, 9, 0])    cylinder(r=4, h=18, $fn=60);
        }

        // 2. THE MOTOR OPENING (Skin-Side)
        // This MUST be an open hole. 10.2mm diameter.
        // We cut slightly deeper (-1 to 7) to ensure it clears the bottom.
        translate([0, 0, -1]) 
            cylinder(d=10.2, h=8, $fn=100);

        // 3. THE BATTERY POD SLOT (Internal Clip)
        // This is the hollow space the headphone battery slides into.
        translate([-15, -7.5, 5]) 
            cube([30, 15, 14]); 

        // 4. WIRE TRENCH
        // For the AWG 30 leads.
        translate([0, -12, 1.5]) 
            cube([2, 10, 4], center=true);

        // 5. EMBOSSED "R" 
        // Subtracted 2mm deep for high tactile visibility.
        translate([0, 0, 16.5]) 
            linear_extrude(height = 3) 
                text("R", size=9, font="Arial:style=Bold", halign="center", valign="center");
    }
}

v52_1_right();