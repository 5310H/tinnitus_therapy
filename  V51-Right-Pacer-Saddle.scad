// V51-R: Right Pacer Saddle for Michigan Protocol
// Optimized for 10mm x 3mm LRA with AWG 30 leads

module pacer_right() {
    difference() {
        union() {
            // 1. THE BASE PLATE
            // Holds the motor against the skin
            cylinder(d=18, h=5, $fn=100);

            // 2. THE CLIPS (Saddles over the battery pod)
            // These "hug" the headphone battery/circuit pod
            translate([-10, -9, 0]) cube([20, 2, 16]); // Bottom Rail
            translate([-10, 7, 0])  cube([20, 2, 16]); // Top Rail
            
            // 3. RETENTION HOOKS
            // These snap over the edges of the pod
            translate([-10, -9, 14]) cube([20, 5, 2]); 
            translate([-10, 4, 14])  cube([20, 5, 2]);
        }

        // 4. MOTOR CAVITY (Skin-Side)
        // 10.1mm for the 10mm motor diameter
        translate([0, 0, 1.2]) 
            cylinder(d=10.1, h=3.1, $fn=100);

        // 5. WIRE TRENCH
        // Sized for the thin AWG 30 wires to exit without pinching
        translate([0, -10, 2.5]) 
            cube([1.2, 15, 2], center=true);

        // 6. EMBOSSED "R" MARKING
        // Subtracting the letter from the outer face for tactile ID
        translate([0, 0, 15]) 
            linear_extrude(height = 1.5) 
                text("R", size=8, font="Arial:style=Bold", halign="center", valign="center");
    }
}

pacer_right();