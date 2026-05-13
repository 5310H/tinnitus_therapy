// V51 Pacer Saddle - Optimized for Vybronics VG1030001XH
// Specs: 10mm Dia, 3mm Thick, AWG 30 Leads

module v51_saddle(side_label) {
    difference() {
        // Main Body: Curved to sit against headphone battery pods
        hull() {
            translate([-8, -8, 0]) cube([16, 16, 6]);
            translate([0, 0, 0]) cylinder(d=18, h=6, $fn=100);
        }

        // Motor Cavity (Skin-side)
        // 10.1mm gives a snug press-fit for the 10mm LRA [cite: 154]
        translate([0, 0, 1.2]) 
            cylinder(d=10.1, h=3.1, $fn=100);

        // Wire Exit Trench
        // 1.2mm width is perfect for the AWG 30 UL3302 wires [cite: 161]
        translate([0, -8, 2.5]) 
            cube([1.2, 12, 2], center=true);

        // Embossed Channel Identifier
        // Subtracts "L" or "R" 1mm deep into the side wall
        translate([0, 8.1, 3]) 
            rotate([90, 0, 0]) 
                linear_extrude(height = 1.5) 
                    text(side_label, size=7, font="Arial:style=Bold", halign="center", valign="center");
    }
}

// RENDER COMMANDS
// To export, uncomment one side at a time
//translate([-15, 0, 0]) v51_saddle("L"); 
translate([15, 0, 0]) v51_saddle("R");