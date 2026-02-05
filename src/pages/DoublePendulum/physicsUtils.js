// Helper function outside component
export const getDerivatives = (state, params) => {
    const { theta1, theta2, omega1, omega2 } = state;
    const { m1, m2, l1, l2, g } = params;

    const delta = theta1 - theta2;
    const den1 = (m1 + m2) * l1 - m2 * l1 * Math.cos(delta) * Math.cos(delta);
    const den2 = (l2 / l1) * den1;

    const dTheta1 = omega1;
    const dTheta2 = omega2;

    const num1 = m2 * l1 * omega1 * omega1 * Math.sin(delta) * Math.cos(delta)
                   + m2 * g * Math.sin(theta2) * Math.cos(delta)
                   + m2 * l2 * omega2 * omega2 * Math.sin(delta)
                   - (m1 + m2) * g * Math.sin(theta1);

    const dOmega1 = num1 / den1;

    const num2 = -m2 * l2 * omega2 * omega2 * Math.sin(delta) * Math.cos(delta)
                   + (m1 + m2) * (g * Math.sin(theta1) * Math.cos(delta)
                   - l1 * omega1 * omega1 * Math.sin(delta)
                   - g * Math.sin(theta2));

    const dOmega2 = num2 / den2;

    return { dTheta1, dTheta2, dOmega1, dOmega2 };
};
