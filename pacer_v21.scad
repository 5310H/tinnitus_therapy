// Tinnitus Pacer - V21 "Zen Pebble" (Max Smoothness Edition)
$fn = 120; // High resolution for ultra-smooth curves

lra_d = 10.3; lra_h = 3.8; wall = 2.2;
band_w = 15.6; band_t = 3.6;

module zen_base() {
    difference() {
        // The "Soft Touch" Base
        hull() {
            cylinder(h=2, d=lra_d + 12); // Main body
            translate([0, 15, 0]) cylinder(h=2, d=band_w + 4); // Neck
        }
        
        // Internal "Bowl" for the motor
        translate([0,0,wall]) cylinder(h=10, d=lra_d + 0.2);
        
        // Smoothed Band Channel
        translate([-band_w/2, 12, -1]) 
            minkowski() {
                cube([band_w, band_t, 25]);
                sphere(r=0.5); // Micro-rounding inside the channel
            }
            
        // Recessed Screw Points (Underneath)
        translate([9, 4, -1]) cylinder(h=10, d=2.2);
        translate([-9, 4, -1]) cylinder(h=10, d=2.2);
        
        // Wire Exit (Soft Notch)
        translate([0, -8, wall]) rotate([0,90,0]) cylinder(h=20, d=2, center=true);
    }
}

module zen_cap() {
    difference() {
        // The "Crest" - Organic Shell
        hull() {
            sphere(d=lra_d + 14);
            translate([0, 15, 0]) sphere(d=band_w + 6);
        }
        
        // Cut the sphere for the mating surface
        translate([-25,-25,-50]) cube([50,50,50]);
        
        // Internal hollow for motor clearance
        translate([0,0,-1]) cylinder(h=lra_h + 1, d=lra_d + 2);
        
        // Countersunk Screw Holes (Top down)
        translate([9, 4, 2]) cylinder(h=10, d=4.5); // Screw head pocket
        translate([9, 4, -5]) cylinder(h=10, d=2.5); // Screw shaft
        translate([-9, 4, 2]) cylinder(h=10, d=4.5);
        translate([-9, 4, -5]) cylinder(h=10, d=2.5);
        
        // Smoothed Path for the Band
        translate([-(band_w+1)/2, 11, -1]) cube([band_w+1, band_t+2, 30]);
    }
}

// --- FULL KIT VIEW ---
translate([-20, 0, 0]) zen_base(); 
translate([20, 0, 0])  zen_base();  
translate([-20, 35, 0]) rotate([0,0,0]) zen_cap();  
translate([20, 35, 0])  rotate([0,0,0]) zen_cap();