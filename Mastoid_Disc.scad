// Tinnitus Pacer - Mastoid Haptic Disc (Slave Unit)
// Optimized for Vybronics 10mm LRA
$fn = 100;

// --- Dimensions ---
lra_d = 10.2;      // 10mm LRA + 0.2 tolerance
lra_h = 3.6;       // Thickness
wall = 1.6;        // Wall thickness for rigid vibration transfer
gap = 0.2;         // Tolerance for snap fit

// --- Module: Bottom Case ---
module disc_base() {
    difference() {
        // Outer Body
        cylinder(h = lra_h + wall, d = lra_d + (wall * 2));
        
        // Motor Pocket
        translate([0, 0, wall]) 
            cylinder(h = lra_h + 1, d = lra_d);
            
        // Wire Tunnel (Exit Hole)
        translate([lra_d/2, -1.5, wall + 0.5]) 
            cube([wall + 2, 3, 3]);
            
        // Snap-Fit Groove (Internal)
        translate([0, 0, lra_h + wall - 0.8])
            difference() {
                cylinder(h = 0.5, d = lra_d + (wall * 2) + 0.1);
                cylinder(h = 0.5, d = lra_d + (wall * 2) - 0.5);
            }
    }
}

// --- Module: Snap-On Lid ---
module disc_lid() {
    union() {
        // Main Cap
        cylinder(h = wall, d = lra_d + (wall * 2));
        
        // Snap Ring (Male)
        translate([0, 0, -0.6])
            difference() {
                cylinder(h = 0.6, d = lra_d + (wall * 2) - gap);
                cylinder(h = 0.6, d = lra_d + gap);
            }
    }
}

// --- Rendering ---
// View them side-by-side
translate([0, 0, 0]) disc_base();
translate([20, 0, 0]) disc_lid();