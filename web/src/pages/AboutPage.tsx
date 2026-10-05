import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <article className="about">
      <div className="about-hero">
        <img src="/logo-288.webp" alt="Logo du Dictionnaire Koulango" />
        <h1>À propos du Dictionnaire Koulango</h1>
        <p>Un dictionnaire collaboratif et gratuit, pour valoriser la langue et la culture koulango.</p>
      </div>

      <section>
        <h2>Pourquoi ce dictionnaire ?</h2>
        <p>
          Le ministère de l'Éducation nationale a décidé d'intégrer l'enseignement des langues locales les plus parlées.
          Le koulango en fait partie : il est majoritairement parlé dans le Nord-Est de la Côte d'Ivoire, dans le district
          du Zanzan (régions du Bounkani et du Gontougo).
        </p>
        <p>
          Pourtant, en cherchant « koulango » sur le Play Store, on ne trouve que la Bible en koulango : aucun dictionnaire.
          Dans des groupes Facebook, des passionnés publient régulièrement des mots et des expressions pour enseigner et
          apprendre la langue, mais ce savoir se perd dans le fil des publications.
        </p>
        <p>
          Le Dictionnaire Koulango leur offre un lieu unique, gratuit et durable, où chaque mot est conservé, vérifié et
          retrouvable en quelques secondes.
        </p>
      </section>

      <section>
        <h2>Ce que vous pouvez faire</h2>
        <ul>
          <li>Chercher un mot du koulango vers le français, ou du français vers le koulango.</li>
          <li>Consulter des fiches complètes : traductions, exemples, prononciation écrite et audio, illustration.</li>
          <li>Garder vos mots favoris et retrouver votre historique, sans créer de compte.</li>
          <li>Proposer un mot ou une expression, seul ou guidé pas à pas par l'assistant.</li>
        </ul>
      </section>

      <section>
        <h2>Des mots vérifiés</h2>
        <p>
          Chaque proposition est relue par un modérateur avant d'être publiée. L'assistant d'ajout n'invente jamais de
          koulango : les mots, les exemples et la prononciation viennent toujours des locuteurs eux-mêmes.
        </p>
      </section>

      <section>
        <h2>La suite : une IA koulango</h2>
        <p>
          Chaque mot, chaque exemple et chaque enregistrement partagé construit une base de connaissances sur la langue.
          Quand elle sera assez solide, nous mettrons en place une IA koulango, construite à partir de ce que la communauté
          aura transmis.
        </p>
      </section>

      <section>
        <h2>Nos engagements</h2>
        <ul>
          <li><b>Gratuit</b> : le dictionnaire est et restera gratuit.</li>
          <li><b>Sans compte</b> : ni pour consulter, ni pour contribuer ; vos favoris restent sur votre appareil.</li>
          <li><b>Fidèle à la langue</b> : les contenus viennent des locuteurs et sont relus avant publication.</li>
        </ul>
      </section>

      <div className="about-actions">
        <Link to="/contribuer" className="about-cta">Proposer un mot</Link>
        <Link to="/devenir-moderateur" className="about-cta ghost">Devenir modérateur</Link>
        <Link to="/contact" className="about-link">Contacter le développeur</Link>
      </div>
    </article>
  );
}
