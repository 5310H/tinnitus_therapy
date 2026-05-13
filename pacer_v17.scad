// Tinnitus Pacer - V17 Comfort Edition
// Features rounded edges and beveled corners for skin contact
$fn = 100;

lra_d = 10.3; 
lra_h = 3.8; 
wall = 2.5; 
band_w = 15.5; 
band_t = 3.5; 

module rounded_housing() {
    difference() {
        union() {
            // 1. Main Disc with Rounded Edge (Skin Side)
            // Using hull to create a smooth chamfered/rounded base
            hull() {
                cylinder(h = 1, d = lra_d + (wall * 2) - 2); 
                translate([0,0,1.5]) cylinder(h = wall + lra_h - 1.5, d = lra_d + (wall * 2));
            }
            
            // 2. The Chimney with Rounded Corners
            translate([-(band_w + 6)/2, lra_d/2, 0])
                minkowski() {
                    cube([band_w + 6, 10, 28]); 
                    sphere(r = 1); // This rounds every edge of the chimney by 1mm
                }
                
            // 3. Symmetrical Wire Reliefs (also rounded)
            hull() {
                translate([lra_d/2, -3, 0]) cube([6, 6, wall + lra_h]);
                translate([lra_d/2 + 2, -1, 0]) sphere(r=1);
            }
            hull() {
                translate([-(lra_d/2 + 6), -3, 0]) cube([6, 6, wall + lra_h]);
                translate([-(lra_d/2 + 8), -1, 0]) sphere(r=1);
            }
        }
        
        // --- HOLLOW OUTS ---
        
        // Motor Cavity
        translate([0, 0, wall]) cylinder(h = lra_h + 2, d = lra_d);
        
        // Wire Channels
        translate([lra_d/2 - 1, -1.5, wall]) cube([12, 3, 3]);
        translate([-(lra_d/2 + 11), -1.5, wall]) cube([12, 3, 3]);
        
        // Headband Slot (Telescoping Entry)
        translate([-band_w/2, lra_d/2 + 2.5, -2])
            cube([band_w, band_t, 40]);

        // M3 Screw Port
        translate([0, lra_d/2 + 15, 18]) 
            rotate([90, 0, 0]) 
            cylinder(h = 30, d = 2.9); 
            
        // Trim the bottom flat (minkowski can make the bottom round)
        translate([-25,-25,-10]) cube([50,50,10]);
    }
}

// Render two units
translate([-18, 0, 0]) rounded_housing();
translate([18, 0, 0]) rounded_housing();