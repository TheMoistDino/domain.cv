import math
import time

class GestureRecognizer:
    def __init__(self, hold_time=0.5):
        """
        hold_time: How long (in seconds) a gesture must be held before it triggers.
        0.5 seconds is usually the sweet spot for a hackathon demo.
        """
        self.hold_time = hold_time
        
        # State trackers for temporal smoothing
        self.stable_domain = "neutral"       # What is currently displaying on screen
        self.candidate_domain = "neutral"    # What the current frame thinks it sees
        self.candidate_start_time = time.time()

    @staticmethod
    def is_finger_extended(tip, pip, wrist):
        """
        Calculates if a finger is extended by comparing the distance from the 
        wrist to the fingertip vs. the wrist to the PIP joint.
        """
        dist_tip = math.hypot(tip[0] - wrist[0], tip[1] - wrist[1])
        dist_pip = math.hypot(pip[0] - wrist[0], pip[1] - wrist[1])
        
        # If the tip is further from the wrist than the middle joint, it's extended
        return dist_tip > dist_pip

    @staticmethod
    def detect_infinite_void(hand):
        """
        Logic for Gojo's Infinite Void:
        1. Index and Middle fingers are extended.
        2. Ring and Pinky fingers are curled.
        3. Index and Middle fingertips are crossed or touching.
        """
        landmarks = hand['landmarks']
        wrist = landmarks[0]
        
        # Grab the necessary points (Tip and PIP for each finger)
        index_tip, index_pip = landmarks[8], landmarks[6]
        middle_tip, middle_pip = landmarks[12], landmarks[10]
        ring_tip, ring_pip = landmarks[16], landmarks[14]
        pinky_tip, pinky_pip = landmarks[20], landmarks[18]

        # 1. Check which fingers are extended
        index_ext = GestureRecognizer.is_finger_extended(index_tip, index_pip, wrist)
        middle_ext = GestureRecognizer.is_finger_extended(middle_tip, middle_pip, wrist)
        ring_ext = GestureRecognizer.is_finger_extended(ring_tip, ring_pip, wrist)
        pinky_ext = GestureRecognizer.is_finger_extended(pinky_tip, pinky_pip, wrist)

        # 2. Check the macro-pose (Index/Middle up, Ring/Pinky down)
        if index_ext and middle_ext and not ring_ext and not pinky_ext:
            
            # 3. Dynamic Thresholding for crossed fingers
            # Distance between the base knuckles (MCP joints 5 and 9)
            index_mcp, middle_mcp = landmarks[5], landmarks[9]
            knuckle_dist = math.hypot(index_mcp[0] - middle_mcp[0], index_mcp[1] - middle_mcp[1])
            
            # Distance between the fingertips (8 and 12)
            tip_dist = math.hypot(index_tip[0] - middle_tip[0], index_tip[1] - middle_tip[1])
            
            # If the distance between the tips is similar to or smaller than 
            # the distance between the knuckles, they are crossed or pinched together!
            if tip_dist < (knuckle_dist * 1.2): 
                return True
                
        return False
    
    @staticmethod
    def detect_malevolent_shrine(hand1, hand2):
        """
        Occlusion-proof Malevolent Shrine:
        Only strictly checks if the two middle fingers are extended and touching.
        Ignores the clasped fingers because MediaPipe scrambles their coordinates.
        """
        lm1 = hand1['landmarks']
        lm2 = hand2['landmarks']
        wrist1, wrist2 = lm1[0], lm2[0]

        hand_size = math.hypot(lm1[9][0] - wrist1[0], lm1[9][1] - wrist1[1]) 
        
        # 1. Check if the middle fingers are extended
        mid1_ext = GestureRecognizer.is_finger_extended(lm1[12], lm1[10], wrist1)
        mid2_ext = GestureRecognizer.is_finger_extended(lm2[12], lm2[10], wrist2)

        if not (mid1_ext and mid2_ext):
            return False

        # 2. Check if the middle fingertips are physically touching (very tight distance)
        mid_tip1, mid_tip2 = lm1[12], lm2[12]
        mid_tip_dist = math.hypot(mid_tip1[0] - mid_tip2[0], mid_tip1[1] - mid_tip2[1])

        # If they are touching, this distance will be very small 
        # (less than the distance from wrist to knuckle)
        if mid_tip_dist < (hand_size * 0.8): 
            return True

        return False
    
    @staticmethod
    def detect_authentic_mutual_love(hand1, hand2):
        """
        Yuta's Domain Expansion:
        1. Hands are distinctly separated.
        2. One hand is a fist (all fingers curled).
        3. One hand is flat (all fingers extended).
        """
        lm1, lm2 = hand1['landmarks'], hand2['landmarks']
        wrist1, wrist2 = lm1[0], lm2[0]

        # 1. Enforce Separation
        wrist_dist = math.hypot(wrist1[0] - wrist2[0], wrist1[1] - wrist2[1])
        hand_size = math.hypot(lm1[9][0] - wrist1[0], lm1[9][1] - wrist1[1]) 

        # Wrists must be clearly separated (at least 2x hand size)
        if wrist_dist < (hand_size * 2.0): 
            return False

        # Helper functions for the macro poses
        def is_fist(lm, wrist):
            return not (GestureRecognizer.is_finger_extended(lm[8], lm[6], wrist) or
                        GestureRecognizer.is_finger_extended(lm[12], lm[10], wrist) or
                        GestureRecognizer.is_finger_extended(lm[16], lm[14], wrist) or
                        GestureRecognizer.is_finger_extended(lm[20], lm[18], wrist))

        def is_flat(lm, wrist):
            return (GestureRecognizer.is_finger_extended(lm[8], lm[6], wrist) and
                    GestureRecognizer.is_finger_extended(lm[12], lm[10], wrist) and
                    GestureRecognizer.is_finger_extended(lm[16], lm[14], wrist) and
                    GestureRecognizer.is_finger_extended(lm[20], lm[18], wrist))

        # 2. Check if we have one fist and one flat hand (order doesn't matter)
        if (is_fist(lm1, wrist1) and is_flat(lm2, wrist2)) or (is_flat(lm1, wrist1) and is_fist(lm2, wrist2)):
            return True

        return False
    
    @staticmethod
    def detect_idle_death_gamble(hand1, hand2):
        """
        Hakari's Domain Expansion (Idle Death Gamble):
        1. Hands are separated.
        2. Middle, Ring, and Pinky fingers are extended.
        3. Thumb and Index fingertips are touching (forming a ring).
        """
        lm1 = hand1['landmarks']
        lm2 = hand2['landmarks']
        wrist1, wrist2 = lm1[0], lm2[0]

        hand_size = math.hypot(lm1[9][0] - wrist1[0], lm1[9][1] - wrist1[1]) 
        wrist_dist = math.hypot(wrist1[0] - wrist2[0], wrist1[1] - wrist2[1])

        # 1. Enforce Separation (Hands shouldn't be fully clasped)
        if wrist_dist < (hand_size * 0.8): 
            return False

        # Helper function to check the specific Hakari hand state
        def is_hakari_hand(lm, wrist):
            # Check if Middle, Ring, and Pinky are extended
            mid_ext = GestureRecognizer.is_finger_extended(lm[12], lm[10], wrist)
            ring_ext = GestureRecognizer.is_finger_extended(lm[16], lm[14], wrist)
            pinky_ext = GestureRecognizer.is_finger_extended(lm[20], lm[18], wrist)
            
            if not (mid_ext and ring_ext and pinky_ext):
                return False
                
            # Check the Ring: Distance between Thumb tip (4) and Index tip (8)
            thumb_tip, index_tip = lm[4], lm[8]
            ring_dist = math.hypot(thumb_tip[0] - index_tip[0], thumb_tip[1] - index_tip[1])
            
            # Local hand size for proportion
            local_hand_size = math.hypot(lm[9][0] - wrist[0], lm[9][1] - wrist[1])
            
            # If the distance between thumb and index is very small, they form a ring
            if ring_dist < (local_hand_size * 0.4):
                return True
                
            return False

        # 2. Both hands must be making the formation
        if is_hakari_hand(lm1, wrist1) and is_hakari_hand(lm2, wrist2):
            return True

        return False
    
    @staticmethod
    def detect_chimera_shadow_garden(detected_hands):
        """
        Lore-Accurate Pivot: Megumi's Divine Dog (Kon) Sign.
        Looks for both hands making the "Rock On" sign 
        (Index and Pinky extended, Middle and Ring curled).
        """
        # We need exactly two hands for this
        if len(detected_hands) < 2:
            return False

        lm1, lm2 = detected_hands[0]['landmarks'], detected_hands[1]['landmarks']
        wrist1, wrist2 = lm1[0], lm2[0]

        hand_size = math.hypot(lm1[9][0] - wrist1[0], lm1[9][1] - wrist1[1])
        wrist_dist = math.hypot(wrist1[0] - wrist2[0], wrist1[1] - wrist2[1])

        # Hands should be in the same general area (summoning pose in front of chest)
        # We give a generous threshold so you don't have to perfectly touch them
        if wrist_dist > (hand_size * 3.5):
            return False

        # Check the finger formations on BOTH hands
        for lm in [lm1, lm2]:
            wrist = lm[0]
            index_ext = GestureRecognizer.is_finger_extended(lm[8], lm[6], wrist)
            mid_ext = GestureRecognizer.is_finger_extended(lm[12], lm[10], wrist)
            ring_ext = GestureRecognizer.is_finger_extended(lm[16], lm[14], wrist)
            pinky_ext = GestureRecognizer.is_finger_extended(lm[20], lm[18], wrist)

            # The Kon check: Index & Pinky UP, Middle & Ring DOWN
            if not (index_ext and pinky_ext and not mid_ext and not ring_ext):
                return False

        return True
    
    @staticmethod
    def detect_self_embodiment_of_perfection(hand1, hand2):
        """
        Mahito's Self-Embodiment of Perfection:
        1. Hands form a hollow sphere/cage.
        2. Wrists/palms are separated.
        3. All five fingertips (Thumb, Index, Middle, Ring, Pinky) are touching their counterparts.
        """
        lm1 = hand1['landmarks']
        lm2 = hand2['landmarks']
        wrist1, wrist2 = lm1[0], lm2[0]

        hand_size = math.hypot(lm1[9][0] - wrist1[0], lm1[9][1] - wrist1[1])
        wrist_dist = math.hypot(wrist1[0] - wrist2[0], wrist1[1] - wrist2[1])

        # 1. Enforce palm separation (Creating the hollow space of the "prison")
        # If wrists are too close, it might accidentally trigger during a clap or prayer
        if wrist_dist < (hand_size * 1.2):
            return False

        # 2. Check if the fingertips are touching
        # We check the distance between the corresponding tips on both hands.
        tips = [4, 8, 12, 16, 20] # Thumb, Index, Middle, Ring, Pinky
        
        for tip in tips:
            tip_dist = math.hypot(lm1[tip][0] - lm2[tip][0], lm1[tip][1] - lm2[tip][1])
            
            # If any pair of fingertips is too far apart, the cage is broken
            if tip_dist > (hand_size * 0.9): # Generous threshold for hackathon lighting
                return False

        # 3. Ensure the hands aren't just closed fists near each other
        # We check if the middle finger is at least somewhat extended away from the wrist
        mid_to_wrist = math.hypot(lm1[12][0] - wrist1[0], lm1[12][1] - wrist1[1])
        if mid_to_wrist < hand_size: 
            return False 

        return True
    
    @staticmethod
    def detect_deadly_sentencing(hand):
        """
        Higuruma's Deadly Sentencing:
        MediaPipe can't see the physical mallet, so we look for the hand HOLDING it.
        We look for a strict, tight fist (all 4 fingers curled, thumb wrapped tight).
        """
        lm = hand['landmarks']
        wrist = lm[0]

        # 1. Check if all 4 main fingers are curled around the handle
        index_ext = GestureRecognizer.is_finger_extended(lm[8], lm[6], wrist)
        middle_ext = GestureRecognizer.is_finger_extended(lm[12], lm[10], wrist)
        ring_ext = GestureRecognizer.is_finger_extended(lm[16], lm[14], wrist)
        pinky_ext = GestureRecognizer.is_finger_extended(lm[20], lm[18], wrist)

        if index_ext or middle_ext or ring_ext or pinky_ext:
            return False

        # 2. Check the thumb to ensure it's a tight grip
        # When holding a handle, the thumb tip (4) wraps over the index knuckle (5)
        thumb_tip = lm[4]
        index_mcp = lm[5]
        
        hand_size = math.hypot(lm[9][0] - wrist[0], lm[9][1] - wrist[1])
        thumb_dist = math.hypot(thumb_tip[0] - index_mcp[0], thumb_tip[1] - index_mcp[1])

        # If the thumb is sticking straight up or out, it's not a tight mallet grip
        if thumb_dist > (hand_size * 1.2): 
            return False

        return True
    
    @staticmethod
    def detect_summon_mahoraga(hand1, hand2):
        """
        Megumi's Summoning of Mahoraga:
        1. Hands are distinctly separated.
        2. Both hands are tight fists (all fingers curled).
        """
        lm1, lm2 = hand1['landmarks'], hand2['landmarks']
        wrist1, wrist2 = lm1[0], lm2[0]

        # 1. Enforce Separation
        wrist_dist = math.hypot(wrist1[0] - wrist2[0], wrist1[1] - wrist2[1])
        hand_size = math.hypot(lm1[9][0] - wrist1[0], lm1[9][1] - wrist1[1]) 

        # Wrists must be clearly separated
        if wrist_dist < (hand_size * 2.0): 
            return False

        # Helper function for a tight fist
        def is_tight_fist(lm, wrist):
            # All 4 fingers curled
            curled = not (GestureRecognizer.is_finger_extended(lm[8], lm[6], wrist) or
                          GestureRecognizer.is_finger_extended(lm[12], lm[10], wrist) or
                          GestureRecognizer.is_finger_extended(lm[16], lm[14], wrist) or
                          GestureRecognizer.is_finger_extended(lm[20], lm[18], wrist))
            
            # Thumb wrapped over the index knuckle
            thumb_tip, index_mcp = lm[4], lm[5]
            thumb_dist = math.hypot(thumb_tip[0] - index_mcp[0], thumb_tip[1] - index_mcp[1])
            thumb_wrapped = thumb_dist < (hand_size * 1.2)

            return curled and thumb_wrapped

        # 2. Check if both hands are tight fists
        if is_tight_fist(lm1, wrist1) and is_tight_fist(lm2, wrist2):
            return True

        return False

    def _get_raw_domain(self, detected_hands):
        if not detected_hands:
            return "neutral"

        # 1. Megumi's Check (Handles the whole list)
        if self.detect_chimera_shadow_garden(detected_hands):
            return "chimera_shadow_garden"

        # 2. Check for the other two-handed domains
        if len(detected_hands) >= 2:
            if self.detect_summon_mahoraga(detected_hands[0], detected_hands[1]):
                return "summon_mahoraga"
            if self.detect_self_embodiment_of_perfection(detected_hands[0], detected_hands[1]):
                return "self_embodiment_of_perfection"
            if self.detect_malevolent_shrine(detected_hands[0], detected_hands[1]):
                return "malevolent_shrine"
            if self.detect_authentic_mutual_love(detected_hands[0], detected_hands[1]):
                return "authentic_mutual_love"
            if self.detect_idle_death_gamble(detected_hands[0], detected_hands[1]):
                return "idle_death_gamble"

        # 3. Check for one-handed domains
        for hand in detected_hands:
            if self.detect_infinite_void(hand):
                return "infinite_void"
            if self.detect_deadly_sentencing(hand):
                return "deadly_sentencing"

        return "neutral"
    
    def get_domain_expansion(self, detected_hands):
        """
        The new gatekeeper. Applies temporal smoothing to prevent flickering.
        """
        # 1. Get the raw detection for this exact millisecond
        raw_domain = self._get_raw_domain(detected_hands)

        # 2. Smoothing Logic
        if raw_domain == self.candidate_domain:
            # The model is seeing the same thing it saw last frame.
            # Has it been held long enough?
            time_held = time.time() - self.candidate_start_time
            
            if time_held >= self.hold_time:
                # Lock it in!
                self.stable_domain = raw_domain
        else:
            # The gesture changed (or flickered). Reset the stopwatch.
            self.candidate_domain = raw_domain
            self.candidate_start_time = time.time()

        # Always return the stable domain to the frontend
        return self.stable_domain