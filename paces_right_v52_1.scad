// V52-R Ergo-Snap
// Specifically for Vybronics VG1030001XH (10mm x 3mm)

module v52_right_final() {
    difference() {
        // 1. THE MAIN ENCLOSURE
        // This creates the smooth, rounded "bean" shape
        hull() {
            translate([-11, -9, 0])  cylinder(r=4, h=18, $fn=60);
            translate([11, -9, 0])   cylinder(r=4, h=18, $fn=60);
            translate([-11, 9, 0])   cylinder(r=4, h=18, $fn=60);
            translate([11, 9, 0])    cylinder(r=4, h=18, $fn=60);
        }

        // 2. THE MOTOR OPENING (The Skin-Side Hole)
        // This cuts a 10.2mm hole through the bottom 6mm.
        // This is what allows the motor to touch your mastoid bone.
        translate([0, 0, -1]) 
            cylinder(d=10.2, h=7, $fn=100);

        // 3. THE BATTERY POD SLOT (Internal Clip)
        // This hollows out the block so it can snap onto the headphones.
        translate([-15, -7.5, 6]) 
            cube([30, 15, 13]); 

        // 4. WIRE TRENCH (The AWG 30 Exit)
        // A tiny 1.5mm channel so the wires don't get pinched.
        translate([0, -12, 1.5]) 
            cube([1.5, 10, 4], center=true);

        // 5. THE "R" MARKING (Tactile Identifier)
        // This carves the letter "R" 1.5mm deep into the top surface.
        translate([0, 0, 17]) 
            linear_extrude(height = 2) 
                text("R", size=9, font="Arial:style=Bold", halign="center", valign="center");
    }
}

v52_right_final();