import cv2
import mediapipe as mp
import math

class HandTracker:
    def __init__(self, static_image_mode=False, max_num_hands=2, min_detection_confidence=0.7, min_tracking_confidence=0.7):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=static_image_mode,
            max_num_hands=max_num_hands,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )
        self.mp_draw = mp.solutions.drawing_utils

    def process_frame(self, frame, draw=True):
        """
        Flips frame like a mirror, extracts pixel coordinates, 
        and pairs them with Left/Right labels.
        """
        # Flip the frame horizontally for a natural selfie-view webcam experience
        # This also ensures MediaPipe's Left/Right labels match the user's actual hands
        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_frame)
        
        h, w, c = frame.shape
        detected_hands = []

        if results.multi_hand_landmarks and results.multi_handedness:
            for hand_landmarks, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
                # Get the label: 'Left' or 'Right'
                hand_label = handedness.classification[0].label
                
                # Convert normalized coordinates (0 to 1) to actual pixel coordinates (x, y)
                # We keep the raw 'z' value for depth/forward-pointing logic
                pixel_landmarks = []
                for lm in hand_landmarks.landmark:
                    px, py = int(lm.x * w), int(lm.y * h)
                    pixel_landmarks.append((px, py, lm.z))
                
                detected_hands.append({
                    'label': hand_label,
                    'landmarks': pixel_landmarks
                })

                if draw:
                    self.mp_draw.draw_landmarks(frame, hand_landmarks, self.mp_hands.HAND_CONNECTIONS)
                    
        return frame, detected_hands

    # --- KINEMATICS HELPER FUNCTIONS ---

    @staticmethod
    def get_euclidean_distance(p1, p2):
        """Calculates 2D pixel distance between two landmarks."""
        return math.hypot(p2[0] - p1[0], p2[1] - p1[1])

    @staticmethod
    def get_joint_angle(p1, p2, p3):
        """
        Calculates the angle (in degrees) at joint p2, formed by p1-p2-p3.
        Useful for checking if a finger is bent or straight.
        """
        # Create vectors A (p2 to p1) and B (p2 to p3)
        ax, ay = p1[0] - p2[0], p1[1] - p2[1]
        bx, by = p3[0] - p2[0], p3[1] - p2[1]
        
        # Calculate dot product and magnitudes
        dot_product = (ax * bx) + (ay * by)
        mag_a = math.hypot(ax, ay)
        mag_b = math.hypot(bx, by)
        
        if mag_a == 0 or mag_b == 0:
            return 0
            
        # Clamp value to avoid math domain errors due to floating point precision
        cos_angle = max(-1.0, min(1.0, dot_product / (mag_a * mag_b)))
        angle_rad = math.acos(cos_angle)
        
        return math.degrees(angle_rad)

    @staticmethod
    def get_hand_orientation(wrist, middle_mcp):
        """
        Determines general 2D orientation (Up, Down, Left, Right) 
        and checks Z-axis for pointing towards camera.
        """
        # Vector from wrist (0) to middle finger base (9)
        dx = middle_mcp[0] - wrist[0]
        dy = middle_mcp[1] - wrist[1]
        
        # Determine 2D direction based on the largest axis difference
        direction = ""
        if abs(dy) > abs(dx):
            direction = "Up" if dy < 0 else "Down"  # y is inverted in image coordinates
        else:
            direction = "Right" if dx > 0 else "Left"
            
        # Z-coordinate check: If middle_mcp Z is significantly lower (more negative) 
        # than the wrist Z, it means it's pointing toward the camera.
        z_diff = middle_mcp[2] - wrist[2]
        if z_diff < -0.05:  # Threshold might need tuning based on testing
            direction += " & Forward"
            
        return direction