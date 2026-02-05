import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Cpu, Lightbulb } from 'lucide-react';
import './ConceptPage.css';

const CONCEPTS = {
    'fluid-dynamics': {
        title: 'Fluid Dynamics (SPH)',
        subtitle: 'Smoothed Particle Hydrodynamics',
        description: 'A Lagrangian method for simulating fluid flows, where the fluid is represented by a set of particles that carry material properties.',
        icon: '💧',
        color: '#0ea5e9', // Sky blue
        overview: `
            Smoothed Particle Hydrodynamics (SPH) is a computational method used for simulating the mechanics of continuum media, such as solid mechanics and fluid flows.
            Unlike grid-based methods (Eulerian), SPH is a mesh-free Lagrangian method where the fluid is discretized into particles.
        `,
        keyConcepts: [
            {
                title: 'Kernel Smoothing',
                text: 'Properties at any point are calculated by summing the contributions of nearby particles, weighted by a smoothing kernel function.'
            },
            {
                title: 'Navier-Stokes Equations',
                text: 'Particles interact according to forces derived from pressure, viscosity, and gravity, approximating the Navier-Stokes equations.'
            },
            {
                title: 'Viscosity & Surface Tension',
                text: 'Simulating the internal friction of the fluid and the cohesive forces at the interface.'
            }
        ],
        plannedFeatures: [
            'Interactive fluid pouring and stirring',
            'Variable viscosity and density controls',
            'Obstacle interaction and boundary handling',
            'Color-coding by velocity or pressure'
        ]
    },
    'wave-interference': {
        title: 'Wave Interference',
        subtitle: 'Ripple Tank Simulation',
        description: 'Visualizing wave propagation, diffraction, and interference patterns in a 2D medium.',
        icon: '🌊',
        color: '#8b5cf6', // Violet
        overview: `
            This simulation models the behavior of waves as they propagate through a medium. It demonstrates fundamental wave phenomena
            that occur in optics, acoustics, and quantum mechanics.
        `,
        keyConcepts: [
            {
                title: 'Huygens\' Principle',
                text: 'Every point on a wavefront is a source of wavelets that spread out in the forward direction at the same speed as the source wave.'
            },
            {
                title: 'Interference',
                text: 'The superposition of waves, leading to constructive (amplified) or destructive (cancelled) regions.'
            },
            {
                title: 'Diffraction',
                text: 'The bending of waves around the corners of an obstacle or through an aperture.'
            }
        ],
        plannedFeatures: [
            'Multiple wave sources with adjustable frequency',
            'Interactive walls and slits for diffraction experiments',
            '3D height-map visualization',
            'Doppler effect demonstration'
        ]
    },
    'soft-body': {
        title: 'Soft Body Simulation',
        subtitle: 'Mass-Spring Systems',
        description: 'Simulating deformable objects and cloth using a network of interconnected masses and springs.',
        icon: '🧶',
        color: '#ec4899', // Pink
        overview: `
            Soft body dynamics focuses on visually realistic physical simulations of the motion and deformation of non-rigid objects.
            The most common approach for real-time simulation is the Mass-Spring system.
        `,
        keyConcepts: [
            {
                title: 'Hooke\'s Law',
                text: 'The force needed to extend or compress a spring by some distance is proportional to that distance.'
            },
            {
                title: 'Verlet Integration',
                text: 'A numerical method used to integrate Newton\'s equations of motion, offering greater stability for constrained systems.'
            },
            {
                title: 'Structural Constraints',
                text: 'Using shear and bend springs to maintain the structure and volume of the soft body.'
            }
        ],
        plannedFeatures: [
            'Interactive cloth dragging and tearing',
            'Adjustable stiffness and damping parameters',
            'Wind and external force interaction',
            '3D textured rendering'
        ]
    }
};

export default function ConceptPage() {
    const { id } = useParams();
    const concept = CONCEPTS[id];

    if (!concept) {
        return (
            <div className="concept-page error">
                <div className="concept-container">
                    <h1>Concept Not Found</h1>
                    <Link to="/" className="back-link">
                        <ArrowLeft size={20} /> Back to Hub
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="concept-page">
            <header className="concept-header" style={{ borderBottomColor: concept.color }}>
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} />
                    <span>Back to Hub</span>
                </Link>
                <div className="header-badge">Coming Soon</div>
            </header>

            <main className="concept-content">
                <section className="hero-section">
                    <div className="icon-wrapper" style={{ background: `${concept.color}20` }}>
                        <span className="concept-icon">{concept.icon}</span>
                    </div>
                    <h1 className="concept-title">
                        <span style={{ color: concept.color }}>{concept.title}</span>
                    </h1>
                    <p className="concept-subtitle">{concept.subtitle}</p>
                    <p className="concept-description">{concept.overview}</p>
                </section>

                <div className="grid-layout">
                    <section className="info-card">
                        <div className="card-header">
                            <BookOpen size={20} className="text-slate-400" />
                            <h2>Key Concepts</h2>
                        </div>
                        <div className="concepts-list">
                            {concept.keyConcepts.map((item, index) => (
                                <div key={index} className="concept-item">
                                    <h3>{item.title}</h3>
                                    <p>{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="info-card">
                        <div className="card-header">
                            <Cpu size={20} className="text-slate-400" />
                            <h2>Planned Features</h2>
                        </div>
                        <ul className="features-list">
                            {concept.plannedFeatures.map((feature, index) => (
                                <li key={index}>
                                    <div className="bullet" style={{ background: concept.color }} />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="info-card full-width">
                        <div className="card-header">
                            <Lightbulb size={20} className="text-slate-400" />
                            <h2>Why this matters</h2>
                        </div>
                        <p className="card-text">
                            These simulations bridge the gap between abstract equations and intuitive understanding.
                            By visualizing {concept.title.toLowerCase()}, we can better grasp the complexity of the physical world,
                            from the flow of water to the propagation of light.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
