// V52-R "Ergo-Snap" - Michigan Protocol Optimized
// Optimized for 10mm x 3mm LRA with AWG 30 leads

module v52_right() {
    difference() {
        // 1. THE ERGONOMIC BODY
        // Created with a hull of cylinders to remove all sharp "square" corners
        hull() {
            translate([-11, -9, 0])  cylinder(r=3, h=18, $fn=60); // Rounded Base
            translate([11, -9, 0])   cylinder(r=3, h=18, $fn=60);
            translate([-11, 9, 0])   cylinder(r=3, h=18, $fn=60);
            translate([11, 9, 0])    cylinder(r=3, h=18, $fn=60);
        }

        // 2. THE MOTOR "OPENING" (Skin-Side Through-Hole)
        // This ensures the LRA touches the mastoid bone directly.
        // 10.2mm diameter = snug fit for 10.0mm motor.
        translate([0, 0, -1]) 
            cylinder(d=10.2, h=8, $fn=100);

        // 3. BATTERY POD SLOT (The Snap-Clip)
        // This hallows out the middle so it "Saddles" over the headphone arm.
        // Adjust the '14.5' value if your headphone battery pod is wider.
        translate([-13, -7.25, 4]) 
            cube([26, 14.5, 15]); 

        // 4. WIRE TRENCH (The AWG 30 Exit)
        // Protects the fragile leads from the Vybronics Rev A/1 update.
        translate([0, -12, 1.5]) 
            cube([1.5, 10, 2], center=true);

        // 5. THE TACTILE "R" IDENTIFIER
        // Embossed (Subtracted) 1.2mm deep for blind orientation.
        translate([0, 0, 17]) 
            linear_extrude(height = 1.2) 
                text("R", size=8, font="Arial:style=Bold", halign="center", valign="center");
    }
}

v52_right();