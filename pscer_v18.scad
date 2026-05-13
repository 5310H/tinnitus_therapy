// Tinnitus Pacer - V18 Separate Comfort Pieces
$fn = 100;

lra_d = 10.3; 
lra_h = 3.8; 
wall = 2.5; 
band_w = 15.5; 
band_t = 3.5; 

module rounded_housing() {
    difference() {
        union() {
            // Main Disc (Skin Side) - Beveled
            hull() {
                cylinder(h = 1, d = lra_d + (wall * 2) - 2); 
                translate([0,0,1.5]) cylinder(h = wall + lra_h - 1.5, d = lra_d + (wall * 2));
            }
            
            // The Chimney (Rounded via Minkowski)
            translate([-(band_w + 6)/2, lra_d/2, 0])
                minkowski() {
                    cube([band_w + 6, 10, 28]); 
                    sphere(r = 1); 
                }
                
            // Symmetrical Wire Reliefs
            hull() {
                translate([lra_d/2, -3, 0]) cube([6, 6, wall + lra_h]);
                translate([lra_d/2 + 2, -1, 0]) sphere(r=1);
            }
            hull() {
                translate([-(lra_d/2 + 6), -3, 0]) cube([6, 6, wall + lra_h]);
                translate([-(lra_d/2 + 8), -1, 0]) sphere(r=1);
            }
        }
        
        // Internal Cavities
        translate([0, 0, wall]) cylinder(h = lra_h + 5, d = lra_d); // Motor
        translate([-band_w/2, lra_d/2 + 2.5, -2]) cube([band_w, band_t, 45]); // Band
        translate([0, lra_d/2 + 15, 18]) rotate([90, 0, 0]) cylinder(h = 30, d = 2.9); // M3 Screw
        
        // Wire Exit Cuts
        translate([lra_d/2 - 1, -1.5, wall]) cube([15, 3, 3]);
        translate([-(lra_d/2 + 14), -1.5, wall]) cube([15, 3, 3]);

        // Flatten the bottom (removes minkowski artifacts)
        translate([-30,-30,-10]) cube([60,60,10]);
    }
}

// --- RENDERING TWO DISTINCT PIECES ---
// Left Unit
translate([-20, 0, 0]) rounded_housing();

// Right Unit (Separated by 40mm)
translate([20, 0, 0]) rounded_housing();