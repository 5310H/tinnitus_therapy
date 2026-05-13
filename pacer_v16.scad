// Tinnitus Pacer - V16 Final Universal M3 Edition
// 1. Copy this code into OpenSCAD
// 2. Press F6 to Render
// 3. Press F7 to Export STL

$fn = 100;

lra_d = 10.3; // Cavity for 10mm LRA
lra_h = 3.8; 
wall = 2.5; 
band_w = 15.5; // Change this if your plastic strap is wider
band_t = 3.5;  // Change this if your plastic strap is thicker

module universal_m3_unit() {
    difference() {
        union() {
            // Main Disc (Skin Side)
            cylinder(h = wall + lra_h, d = lra_d + (wall * 2));
            
            // Telescoping Chimney (Adjustment Sleeve)
            translate([-(band_w + 6)/2, lra_d/2, 0])
                cube([band_w + 6, 12, 30]); 
                
            // Symmetrical Wire Strain Reliefs
            translate([lra_d/2, -3, 0]) cube([6, 6, wall + lra_h]); 
            translate([-(lra_d/2 + 6), -3, 0]) cube([6, 6, wall + lra_h]);
        }
        
        // Motor Cavity
        translate([0, 0, wall]) cylinder(h = lra_h + 1, d = lra_d);
        
        // Wire Channels
        translate([lra_d/2 - 1, -1.5, wall]) cube([10, 3, 3]);
        translate([-(lra_d/2 + 9), -1.5, wall]) cube([10, 3, 3]);
        
        // Headband Slot
        translate([-band_w/2, lra_d/2 + 2.5, -1])
            cube([band_w, band_t, 35]);

        // M3 Screw Port (Self-Tapping)
        translate([0, lra_d/2 + 15, 18]) 
            rotate([90, 0, 0]) 
            cylinder(h = 25, d = 2.9); 
    }
}

// Render two identical units
translate([-15, 0, 0]) universal_m3_unit();
translate([15, 0, 0]) universal_m3_unit();